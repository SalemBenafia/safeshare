// Post-processing for scan results (AI + regex), applied after merging.
// Makes the masked text clearer for the cloud model without weakening privacy:
// trims edge punctuation, drops role words and non-dates, fixes date and organisation types.
import { classifyDate, hasBirthKeywordNearby, isDateText } from "./dates";
import { claimLongestFirst, findOccurrences } from "./text";
import { itemId, isMoreSpecific, type PiiItem } from "./types";

export { hasBirthKeywordNearby };

/** Leading/trailing characters that are never part of an item ("+" is kept for phones). */
const EDGE_PUNCT = /^[\s()[\]{}.,;:!?"'«»“”‘’\-–—]+|[\s()[\]{}.,;:!?"'«»“”‘’\-–—]+$/g;

/** Role words: they describe a role in the document, not a person. */
const ROLE_WORDS = new Set([
  "client", "clients", "consultant", "consultants", "party", "parties", "manager",
  "company", "agreement", "services", "service", "contractor", "customer", "supplier",
  "provider", "employer", "employee", "patient", "doctor", "tenant", "landlord", "buyer",
  "seller", "prestataire", "société", "contrat", "partie", "parties",
]);
const LEADING_ARTICLE = /^(?:the|le|la|les|l')\s*/i;

/** Not dates: plain years ("2026") and clause numbers ("1.2"). */
const BARE_YEAR = /^(?:19|20)\d{2}$/;
const CLAUSE_NUMBER = /^\d+(?:\.\d+)+$/;

/** Legal-form suffixes that mark an organisation, not a person. */
const ORG_MARKER = /(?:^|\s)(?:SARL|SUARL|SAS|SA|S\.A\.?|Ltd\.?|Limited|Inc\.?|GmbH|LLC|PLC|Corp\.?)(?=$|[\s,])/;

export function trimItemText(value: string): string {
  return value.replace(EDGE_PUNCT, "");
}

export function isRoleWord(value: string): boolean {
  return ROLE_WORDS.has(value.replace(LEADING_ARTICLE, "").toLowerCase());
}

function cleanOne(text: string, item: PiiItem): PiiItem | null {
  const value = trimItemText(item.text);
  if (value.length < 3 || findOccurrences(text, value).length === 0) return null;
  if (isRoleWord(value) || BARE_YEAR.test(value)) return null;

  let type = item.type;
  if (isDateText(value)) {
    // A full date, whatever the AI called it: birth date only with a birth keyword nearby.
    type = classifyDate(text, value);
  } else if (type === "DATE" || type === "DATE_OF_BIRTH") {
    // The AI called it a date but it is not a full date: durations and clause numbers are dropped.
    if (!/\d/.test(value) || CLAUSE_NUMBER.test(value)) return null;
    type = type === "DATE_OF_BIRTH" && hasBirthKeywordNearby(text, value) ? "DATE_OF_BIRTH" : "DATE";
  }
  if (type === "PERSON" && ORG_MARKER.test(value)) type = "OTHER";

  return value === item.text && type === item.type
    ? item
    : { ...item, id: value === item.text ? item.id : itemId(value), text: value, type };
}

/** Text allowed between two parts of one address: a comma and/or a little whitespace. */
const ADDRESS_GAP = /^[ \t]*,?[ \t]*\n?[ \t]*$/;

/**
 * Joins address parts that the AI returned separately but that sit next to each
 * other ("8 Rue Ibn Khaldoun" + ", " + "3027 Sfax" + ", " + "Tunisia") into one
 * ADDRESS item. A part is kept on its own only if it also appears elsewhere.
 */
export function mergeAdjacentAddresses(text: string, items: PiiItem[]): PiiItem[] {
  const parts = items.filter((i) => i.type === "ADDRESS");
  if (parts.length < 2) return items;

  const spans = claimLongestFirst(
    parts.flatMap((item) =>
      findOccurrences(text, item.text).map((start) => ({ start, end: start + item.text.length, item })),
    ),
  );

  const groups: (typeof spans)[] = [];
  for (const span of spans) {
    const current = groups[groups.length - 1];
    const prev = current?.[current.length - 1];
    if (prev && ADDRESS_GAP.test(text.slice(prev.end, span.start))) current.push(span);
    else groups.push([span]);
  }

  const merged: PiiItem[] = [];
  const covered: { start: number; end: number }[] = [];
  for (const group of groups) {
    if (group.length < 2) continue;
    const start = group[0].start;
    const end = group[group.length - 1].end;
    const value = text.slice(start, end);
    covered.push({ start, end });
    if (merged.some((m) => m.text === value)) continue;
    merged.push({
      id: itemId(value),
      text: value,
      type: "ADDRESS",
      enabled: group.some((s) => s.item.enabled),
      origin: group[0].item.origin,
    });
  }
  if (merged.length === 0) return items;

  // Drop a part when every one of its occurrences is inside a merged address.
  const isCovered = (item: PiiItem) =>
    findOccurrences(text, item.text).every((s) =>
      covered.some((c) => s >= c.start && s + item.text.length <= c.end),
    );
  const kept = items.filter((i) => i.type !== "ADDRESS" || !isCovered(i));
  const existing = new Set(kept.map((i) => i.text));
  return [...kept, ...merged.filter((m) => !existing.has(m.text))];
}

/**
 * Cleans merged scan results. Only for scan output: items the user adds by hand
 * are never filtered. Trimming can create duplicates, so they are merged again
 * (the more specific type wins). Adjacent address parts become one address.
 */
export function cleanScanItems(text: string, items: PiiItem[]): PiiItem[] {
  const byText = new Map<string, PiiItem>();
  for (const item of items) {
    const cleaned = cleanOne(text, item);
    if (!cleaned) continue;
    const existing = byText.get(cleaned.text);
    if (!existing) byText.set(cleaned.text, cleaned);
    else if (isMoreSpecific(cleaned.type, existing.type)) byText.set(cleaned.text, { ...existing, type: cleaned.type });
  }
  return mergeAdjacentAddresses(text, [...byText.values()]);
}
