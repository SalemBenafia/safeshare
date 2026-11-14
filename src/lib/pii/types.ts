/** Personal-data categories (SPEC §7). */
export const PII_TYPES = [
  "PERSON",
  "EMAIL",
  "PHONE",
  "ID_NUMBER",
  "ADDRESS",
  "BANK",
  "HEALTH",
  "DATE_OF_BIRTH",
  "OTHER",
] as const;

export type PiiType = (typeof PII_TYPES)[number];

/** Where an item came from: the on-device model, the regex scanner, or the user. */
export type PiiOrigin = "ai" | "regex" | "user";

export interface PiiItem {
  id: string;
  text: string;
  type: PiiType;
  enabled: boolean;
  origin: PiiOrigin;
}

/** Placeholder -> real value. Lives in memory only: never store, log or send it. */
export type PlaceholderMap = Map<string, string>;

/** Most specific first. Used when two sources disagree about an item's type. */
export const TYPE_SPECIFICITY: readonly PiiType[] = [
  "EMAIL",
  "BANK",
  "PHONE",
  "ID_NUMBER",
  "DATE_OF_BIRTH",
  "HEALTH",
  "ADDRESS",
  "PERSON",
  "OTHER",
];

export function isPiiType(value: unknown): value is PiiType {
  return typeof value === "string" && (PII_TYPES as readonly string[]).includes(value);
}

/** True if `a` is a more specific type than `b`. */
export function isMoreSpecific(a: PiiType, b: PiiType): boolean {
  return TYPE_SPECIFICITY.indexOf(a) < TYPE_SPECIFICITY.indexOf(b);
}

/** Deterministic id from the item text (FNV-1a), so ids are stable across scans. */
export function itemId(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `pii-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
