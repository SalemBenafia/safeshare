// Privacy scan (SPEC §3 step 2). The AI part runs ONLY on-device (scanModel).
import type { DeviceStatus } from "../ai/device";
import { scanModel } from "../ai/models";
import type { Settings } from "../settings";
import { cleanScanItems } from "./clean";
import { scanWithRegex } from "./regex";
import { isMoreSpecific, isPiiType, itemId, PII_TYPES, type PiiItem, type PiiType } from "./types";

export { scanWithRegex };

// ---------- chunking ----------

/** Splits `text` after each match of `separator`, keeping the separator on the left piece. */
function splitKeep(text: string, separator: RegExp): string[] {
  const pieces: string[] = [];
  let last = 0;
  for (const m of text.matchAll(separator)) {
    const end = (m.index ?? 0) + m[0].length;
    if (end > last) {
      pieces.push(text.slice(last, end));
      last = end;
    }
  }
  if (last < text.length) pieces.push(text.slice(last));
  return pieces;
}

const PARAGRAPH = /\n[ \t]*\n\s*/g;
const SENTENCE = /(?<=[.!?])\s+/g;
const WORD = /\s+/g;

/** Breaks text into units no longer than maxChars where possible: paragraph > sentence > word. */
function units(text: string, maxChars: number, levels: RegExp[]): string[] {
  if (text.length <= maxChars || levels.length === 0) return [text];
  const [level, ...rest] = levels;
  return splitKeep(text, level).flatMap((piece) => units(piece, maxChars, rest));
}

/**
 * Splits text into chunks of at most `maxChars`, on paragraph, then sentence,
 * then word boundaries. Never cuts inside a word (an over-long word becomes its
 * own chunk). `chunks.join("") === text`.
 */
export function chunkText(text: string, maxChars: number): string[] {
  if (!(maxChars > 0)) throw new Error("maxChars must be positive.");
  if (!text) return [];
  const chunks: string[] = [];
  let current = "";
  for (const unit of units(text, maxChars, [PARAGRAPH, SENTENCE, WORD])) {
    if (current && current.length + unit.length > maxChars) {
      chunks.push(current);
      current = "";
    }
    current += unit;
  }
  if (current) chunks.push(current);
  return chunks;
}

// ---------- AI scan (on-device only) ----------

// Invented examples that teach the edge cases (role words, ordinary dates, companies, brackets).
const SCAN_EXAMPLES = [
  [
    'Signed on 3 March 2025 by Sami Kefi (the Client), born on 4 June 1990.',
    '{"items":[{"text":"3 March 2025","type":"DATE"},{"text":"Sami Kefi","type":"PERSON"},{"text":"4 June 1990","type":"DATE_OF_BIRTH"}]}',
  ],
  [
    "Olive Data SARL will pay the Consultant 500 euros by 30 April 2026.",
    '{"items":[{"text":"Olive Data SARL","type":"OTHER"},{"text":"30 April 2026","type":"DATE"}]}',
  ],
  [
    "Call Nadia Ferchichi at +216 20 111 222 (mobile) or nadia.f@example.com.",
    '{"items":[{"text":"Nadia Ferchichi","type":"PERSON"},{"text":"+216 20 111 222","type":"PHONE"},{"text":"nadia.f@example.com","type":"EMAIL"}]}',
  ],
];

export function buildScanPrompt(chunk: string): string {
  return [
    "You are a privacy scanner. List every piece of personal data in the text below.",
    "Copy each item exactly as written in the text: same spelling, same spacing. Do not translate, correct or invent anything.",
    "",
    "Rules:",
    "- Personal data: names of people, email addresses, phone numbers, ID or file numbers, home or postal addresses, bank or card numbers, health information, and full dates.",
    "- Company and organisation names have type OTHER, never PERSON.",
    "- Never list role words such as Client, Consultant, Party, Manager, Patient or Company.",
    "- Dates are personal data. Use DATE_OF_BIRTH only when the text says it is a birth date (born, date of birth, DOB, né le, née le). Every other full date (contract, appointment, admission, visit) is DATE.",
    "- Plain years (2026), durations (thirty days) and clause numbers (1.2) are not dates: do not list them.",
    "- An address is ONE item: copy the whole address (street, postcode, city, country) as written, not its parts separately.",
    "- Do not include surrounding brackets, quotes or punctuation in an item.",
    `- Use only these types: ${PII_TYPES.join(", ")}.`,
    "",
    "Examples:",
    ...SCAN_EXAMPLES.flatMap(([text, answer]) => [`Text: ${text}`, `Answer: ${answer}`]),
    "",
    'Answer with JSON only, in this shape: {"items":[{"text":"...","type":"PERSON"}]}. If there is no personal data, answer {"items":[]}.',
    "",
    "TEXT START",
    chunk,
    "TEXT END",
  ].join("\n");
}

export interface RawScanItem {
  text: string;
  type: PiiType;
}

/** Parses the model's JSON safely. Returns null if it is not valid JSON of the expected shape. */
export function parseScanResponse(raw: string): RawScanItem[] | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return null;
  }
  const list =
    data && typeof data === "object" && "items" in data ? (data as { items: unknown }).items : null;
  if (!Array.isArray(list)) return null;

  const out: RawScanItem[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const { text, type } = entry as { text?: unknown; type?: unknown };
    if (typeof text !== "string") continue;
    out.push({ text, type: isPiiType(type) ? type : "OTHER" });
  }
  return out;
}

async function askChunk(chunk: string): Promise<RawScanItem[] | null> {
  const result = await scanModel().generateContent(buildScanPrompt(chunk));
  return parseScanResponse(result.response.text());
}

export interface AIScanResult {
  items: PiiItem[];
  /** Chunks whose answer was invalid twice. The regex scan still covers them. */
  failedChunks: number;
}

/**
 * Scans chunk by chunk with Gemini Nano (ONLY_ON_DEVICE). Retries a chunk once
 * on invalid JSON, and drops any item that does not appear exactly in its chunk.
 */
export async function scanWithAI(text: string, chunkChars: number): Promise<AIScanResult> {
  const found: PiiItem[] = [];
  let failedChunks = 0;

  for (const chunk of chunkText(text, chunkChars)) {
    if (!chunk.trim()) continue;
    const parsed = (await askChunk(chunk)) ?? (await askChunk(chunk));
    if (parsed === null) {
      failedChunks++;
      continue;
    }
    for (const raw of parsed) {
      const value = raw.text.trim();
      // Hallucination guard: the item must be copied exactly from the source.
      if (value.length < 2 || !chunk.includes(value)) continue;
      found.push({ id: itemId(value), text: value, type: raw.type, enabled: true, origin: "ai" });
    }
  }
  return { items: mergeItems(found), failedChunks };
}

// ---------- merge + full scan ----------

/**
 * Merges lists, deduplicating by exact text. The first item keeps its id,
 * enabled flag and origin; the type is upgraded to the more specific one.
 */
export function mergeItems(...lists: PiiItem[][]): PiiItem[] {
  const byText = new Map<string, PiiItem>();
  for (const list of lists) {
    for (const item of list) {
      const existing = byText.get(item.text);
      if (!existing) {
        byText.set(item.text, { ...item });
      } else if (isMoreSpecific(item.type, existing.type)) {
        existing.type = item.type;
      }
    }
  }
  return [...byText.values()];
}

export interface ScanResult {
  items: PiiItem[];
  usedAI: boolean;
  failedChunks: number;
}

/** Regex always; plus on-device AI when the model is available. Sorted by position. */
export async function scanDocument(
  text: string,
  deviceStatus: DeviceStatus,
  settings: Pick<Settings, "scan_chunk_chars">,
): Promise<ScanResult> {
  const regexItems = scanWithRegex(text);
  let items = regexItems;
  let usedAI = false;
  let failedChunks = 0;

  if (deviceStatus === "available") {
    try {
      const ai = await scanWithAI(text, settings.scan_chunk_chars);
      items = mergeItems(regexItems, ai.items);
      usedAI = true;
      failedChunks = ai.failedChunks;
    } catch {
      // The on-device model failed: keep the regex results.
    }
  }

  // Trim punctuation, drop role words and ordinary dates, fix organisation types.
  const cleaned = cleanScanItems(text, items);
  const position = (item: PiiItem) => text.indexOf(item.text);
  return { items: cleaned.sort((a, b) => position(a) - position(b)), usedAI, failedChunks };
}
