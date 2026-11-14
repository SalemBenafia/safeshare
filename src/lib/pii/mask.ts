// Masking and unmasking (SPEC §3 steps 4 and 7). Runs on-device only.
import { scanWithRegex } from "./regex";
import { claimLongestFirst, findOccurrences } from "./text";
import { PII_TYPES, type PiiItem, type PiiType, type PlaceholderMap } from "./types";

export interface MaskResult {
  masked: string;
  /** "[PERSON_1]" -> real value. In memory only: never store, log or send it. */
  map: PlaceholderMap;
}

interface Claim {
  start: number;
  end: number;
  item: PiiItem;
}

/**
 * Replaces each enabled item with a placeholder such as `[PERSON_1]`.
 * Longest items win on overlap; the same value always gets the same placeholder;
 * numbering follows the order of first appearance, per type.
 */
export function mask(text: string, items: PiiItem[]): MaskResult {
  const enabled = new Map<string, PiiItem>();
  for (const item of items) {
    if (item.enabled && item.text && !enabled.has(item.text)) enabled.set(item.text, item);
  }

  const candidates: Claim[] = [];
  for (const item of enabled.values()) {
    for (const start of findOccurrences(text, item.text)) {
      candidates.push({ start, end: start + item.text.length, item });
    }
  }
  const claims = claimLongestFirst(candidates);

  const placeholderFor = new Map<string, string>();
  const counters = new Map<PiiType, number>();
  const map: PlaceholderMap = new Map();
  let masked = "";
  let last = 0;

  for (const { start, end, item } of claims) {
    let placeholder = placeholderFor.get(item.text);
    if (!placeholder) {
      let n = counters.get(item.type) ?? 0;
      do {
        n++;
        placeholder = `[${item.type}_${n}]`;
      } while (text.includes(placeholder)); // never reuse a token already in the source
      counters.set(item.type, n);
      placeholderFor.set(item.text, placeholder);
      map.set(placeholder, item.text);
    }
    masked += text.slice(last, start) + placeholder;
    last = end;
  }
  masked += text.slice(last);
  return { masked, map };
}

const TOKEN = `(?:${PII_TYPES.join("|")})_\\d+`;
const PLACEHOLDER = new RegExp(
  `\\[(${TOKEN})\\]|(?<![\\p{L}\\p{N}_\\[])(${TOKEN})(?![\\p{L}\\p{N}_\\]])`,
  "gu",
);

/**
 * Restores real values on the device. Accepts `[PERSON_1]`, and also a bare
 * `PERSON_1` when it is an exact whole word. Unknown placeholders are left as is.
 */
export function unmask(text: string, map: PlaceholderMap): string {
  return text.replace(PLACEHOLDER, (match, bracketed?: string, bare?: string) => {
    const value = map.get(`[${bracketed ?? bare}]`);
    return value ?? match;
  });
}

export interface Leak {
  text: string;
  type: PiiType;
  /** "item": an enabled item still present. "regex": a new regex hit. */
  reason: "item" | "regex";
}

export interface LeakReport {
  ok: boolean;
  /** In memory only: shown to the user locally, never logged or sent. */
  leaks: Leak[];
}

/**
 * Must pass before any hybrid or cloud call; if `ok` is false, block the call.
 * Reports enabled items still in the masked text, plus new regex hits that the
 * user did not deliberately switch off.
 */
export function leakCheck(masked: string, items: PiiItem[]): LeakReport {
  const leaks: Leak[] = [];
  const reported = new Set<string>();
  const disabled = new Set(items.filter((i) => !i.enabled).map((i) => i.text));

  for (const item of items) {
    if (!item.enabled || reported.has(item.text)) continue;
    if (findOccurrences(masked, item.text).length > 0) {
      leaks.push({ text: item.text, type: item.type, reason: "item" });
      reported.add(item.text);
    }
  }
  for (const hit of scanWithRegex(masked)) {
    if (disabled.has(hit.text) || reported.has(hit.text)) continue;
    leaks.push({ text: hit.text, type: hit.type, reason: "regex" });
    reported.add(hit.text);
  }
  return { ok: leaks.length === 0, leaks };
}
