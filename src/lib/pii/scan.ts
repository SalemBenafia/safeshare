// Privacy scan (SPEC §3 step 2). The AI part runs ONLY on-device.
import { notImplemented } from "../notImplemented";
import type { PiiItem } from "./types";

/** Splits text into chunks of at most `maxChars`, on sensible boundaries. */
export function chunkText(text: string, maxChars: number): string[] {
  void text;
  void maxChars;
  return notImplemented("chunkText");
}

/** Finds emails, phone numbers, IDs, IBANs, dates and similar with regular expressions. */
export function scanWithRegex(text: string): PiiItem[] {
  void text;
  return notImplemented("scanWithRegex");
}

/** Asks Gemini Nano (ONLY_ON_DEVICE) for a JSON list of personal items. */
export async function scanWithAI(text: string): Promise<PiiItem[]> {
  void text;
  return notImplemented("scanWithAI");
}

/** Merges and de-duplicates items from several sources. */
export function mergeItems(...lists: PiiItem[][]): PiiItem[] {
  void lists;
  return notImplemented("mergeItems");
}

export interface ScanOptions {
  chunkChars: number;
  useAI: boolean;
}

/** Full scan: regex always, plus on-device AI when available. */
export async function scanDocument(
  text: string,
  options: ScanOptions,
): Promise<PiiItem[]> {
  void text;
  void options;
  return notImplemented("scanDocument");
}
