// Masking and unmasking (SPEC §3 steps 4 and 7). Runs on-device only.
import { scanWithRegex } from "./regex";
import { claimLongestFirst, findOccurrences } from "./text";
import { itemId, PII_TYPES, type PiiItem, type PiiType, type PlaceholderMap } from "./types";

export interface MaskResult {
  masked: string;
  /** "[PERSON_1]" -> real value. In memory only: never store, log or send it. */
  map: PlaceholderMap;
}

// ---------- what gets masked ----------

/** Name particles and titles that are never masked on their own. */
const NAME_PARTICLES = new Set([
  "ben", "bin", "bint", "ibn", "el", "al", "de", "du", "da", "di", "del", "della", "des",
  "la", "le", "van", "von", "der", "den", "dos", "das", "mr", "mrs", "ms", "miss", "dr", "prof",
]);

/**
 * Parts of enabled multi-word names, so "Mr Moreau" is masked when "Julien Moreau"
 * is an item. Parts of 3+ letters only; particles and titles are skipped.
 */
export function expandNameParts(items: PiiItem[]): PiiItem[] {
  const known = new Set(items.map((i) => i.text.toLowerCase()));
  const parts: PiiItem[] = [];
  for (const item of items) {
    if (!item.enabled || item.type !== "PERSON") continue;
    const words = item.text.split(/[\s-]+/).filter(Boolean);
    if (words.length < 2) continue;
    for (const word of words) {
      const part = word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
      const key = part.toLowerCase();
      if (part.length < 3 || NAME_PARTICLES.has(key) || known.has(key)) continue;
      known.add(key);
      parts.push({ ...item, id: itemId(part), text: part });
    }
  }
  return parts;
}

interface Target {
  item: PiiItem;
  /** Name parts only match capitalised words ("Will", not "will"). */
  capitalisedOnly: boolean;
}

/** Enabled items (any case) plus their name parts (capitalised only). */
function maskTargets(items: PiiItem[]): Target[] {
  const seen = new Set<string>();
  const targets: Target[] = [];
  for (const item of items) {
    const key = item.text.toLowerCase();
    if (!item.enabled || !item.text || seen.has(key)) continue;
    seen.add(key);
    targets.push({ item, capitalisedOnly: false });
  }
  for (const part of expandNameParts(items)) targets.push({ item: part, capitalisedOnly: true });
  return targets;
}

const isCapital = (ch: string | undefined) => !!ch && ch !== ch.toLowerCase();

function targetOccurrences(text: string, target: Target): number[] {
  return findOccurrences(text, target.item.text, { ignoreCase: true }).filter(
    (start) => !target.capitalisedOnly || isCapital(text[start]),
  );
}

export interface MaskSpan {
  start: number;
  end: number;
  item: PiiItem;
}

/**
 * Where enabled items (and name parts) will be masked, longest first, without
 * overlaps. Shared by mask(), leakCheck() and the review highlights.
 */
export function maskSpans(text: string, items: PiiItem[]): MaskSpan[] {
  const candidates: MaskSpan[] = [];
  for (const target of maskTargets(items)) {
    for (const start of targetOccurrences(text, target)) {
      candidates.push({ start, end: start + target.item.text.length, item: target.item });
    }
  }
  return claimLongestFirst(candidates);
}

/**
 * Replaces each enabled item with a placeholder such as `[PERSON_1]`.
 * Matches any letter case; parts of names ("Moreau") get their own placeholder.
 * Longest items win on overlap; the same value always gets the same placeholder;
 * numbering follows the order of first appearance, per type.
 */
export function mask(text: string, items: PiiItem[]): MaskResult {
  const placeholderFor = new Map<string, string>();
  const counters = new Map<PiiType, number>();
  const map: PlaceholderMap = new Map();
  let masked = "";
  let last = 0;

  const placeholderOf = (item: PiiItem): string => {
    const key = item.text.toLowerCase();
    let placeholder = placeholderFor.get(key);
    if (!placeholder) {
      let n = counters.get(item.type) ?? 0;
      do {
        n++;
        placeholder = `[${item.type}_${n}]`;
      } while (text.includes(placeholder)); // never reuse a token already in the source
      counters.set(item.type, n);
      placeholderFor.set(key, placeholder);
      map.set(placeholder, item.text);
    }
    return placeholder;
  };

  for (const { start, end, item } of maskSpans(text, items)) {
    masked += text.slice(last, start) + placeholderOf(item);
    last = end;
  }
  masked += text.slice(last);

  // Name parts that only appear inside full names still get a placeholder, so a
  // question or an answer that says "Ms Mansour" can be masked with this map.
  for (const part of expandNameParts(items)) placeholderOf(part);
  return { masked, map };
}

/**
 * Masks extra text (the user's question, or an answer before it is stored) with
 * an EXISTING map, so the same value gets the same placeholder as in the document.
 * Any letter case, longest values first, whole words only.
 */
export function maskWithMap(text: string, map: PlaceholderMap): string {
  const candidates: { start: number; end: number; placeholder: string }[] = [];
  for (const [placeholder, value] of map) {
    for (const start of findOccurrences(text, value, { ignoreCase: true })) {
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

// ---------- leak check ----------

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
/** Stricter set for data that will be STORED (history): reworded dates block too. */
const STRICT_REGEX_TYPES: ReadonlySet<PiiType> = new Set([...BLOCKING_REGEX_TYPES, "DATE", "DATE_OF_BIRTH"]);

/**
 * Must pass before any hybrid or cloud call; if `ok` is false, block the call.
 * Reports enabled items (any case, including name parts) still in the text, plus
 * new email, phone, ID or bank regex hits that the user did not deliberately
 * switch off. With `strict` (used before storing history), dates block too.
 */
export function leakCheck(masked: string, items: PiiItem[], options: { strict?: boolean } = {}): LeakReport {
  const leaks: Leak[] = [];
  const reported = new Set<string>();
  const disabled = new Set(items.filter((i) => !i.enabled).map((i) => i.text.toLowerCase()));

  for (const { item } of maskSpans(masked, items)) {
    const key = item.text.toLowerCase();
    if (reported.has(key)) continue;
    leaks.push({ text: item.text, type: item.type, reason: "item" });
    reported.add(key);
  }
  const blocking = options.strict ? STRICT_REGEX_TYPES : BLOCKING_REGEX_TYPES;
  for (const hit of scanWithRegex(masked)) {
    // Dates the user chose to show never block a task (only stored history, with `strict`).
    if (!blocking.has(hit.type)) continue;
    const key = hit.text.toLowerCase();
    if ((!options.strict && disabled.has(key)) || reported.has(key)) continue;
    leaks.push({ text: hit.text, type: hit.type, reason: "regex" });
    reported.add(key);
  }
  return { ok: leaks.length === 0, leaks };
}

/** Switched-off items that are still visible in `text`, counted per type (for the consent dialog). */
export function visibleItemCounts(text: string, items: PiiItem[]): Partial<Record<PiiType, number>> {
  const counts: Partial<Record<PiiType, number>> = {};
  const seen = new Set<string>();
  for (const item of items) {
    const key = item.text.toLowerCase();
    if (item.enabled || seen.has(key)) continue;
    seen.add(key);
    if (findOccurrences(text, item.text, { ignoreCase: true }).length > 0) {
      counts[item.type] = (counts[item.type] ?? 0) + 1;
    }
  }
  return counts;
}
