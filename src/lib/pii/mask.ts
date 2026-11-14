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

/**
 * Masks extra text (e.g. the user's question) with an EXISTING map, so the same
 * value gets the same placeholder as in the document. Longest values first,
 * whole words only. Values not in the map are left as they are.
 */
export function maskWithMap(text: string, map: PlaceholderMap): string {
  const candidates: { start: number; end: number; placeholder: string }[] = [];
  for (const [placeholder, value] of map) {
    for (const start of findOccurrences(text, value)) {
      candidates.push({ start, end: start + value.length, placeholder });
    }
  }
  let out = "";
  let last = 0;
  for (const { start, end, placeholder } of claimLongestFirst(candidates)) {
    out += text.slice(last, start) + placeholder;
    last = end;
  }
  return out + text.slice(last);
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

/** A bracketed word the model invented, e.g. "[CLIENT]" or "[SERVICE_PROVIDER]" (no number). */
const INVENTED_PLACEHOLDER = /\[([A-Z]{2,}(?:[ _][A-Z]{2,})*)\]/g;

/**
 * Cleans model output: words the model put in brackets itself (it imitates our
 * placeholder style) become normal words, e.g. "[CLIENT]" -> "Client".
 * Real placeholders always have a number ("[PERSON_1]") and are not touched.
 */
export function removeInventedPlaceholders(text: string): string {
  return text.replace(INVENTED_PLACEHOLDER, (_m, words: string) =>
    words
      .split(/[ _]/)
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" "),
  );
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

/** Regex hit types that block a task even when they are not an item. */
const BLOCKING_REGEX_TYPES: ReadonlySet<PiiType> = new Set(["EMAIL", "PHONE", "ID_NUMBER", "BANK"]);

/**
 * Must pass before any hybrid or cloud call; if `ok` is false, block the call.
 * Reports enabled items still in the masked text, plus new email, phone, ID or
 * bank regex hits that the user did not deliberately switch off.
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
    // Only contact, ID and bank patterns block on their own; dates the user chose to show never do.
    if (!BLOCKING_REGEX_TYPES.has(hit.type)) continue;
    if (disabled.has(hit.text) || reported.has(hit.text)) continue;
    leaks.push({ text: hit.text, type: hit.type, reason: "regex" });
    reported.add(hit.text);
  }
  return { ok: leaks.length === 0, leaks };
}
