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
