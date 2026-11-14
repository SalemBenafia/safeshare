// Browser-only. Saved results in users/{uid}/history (SPEC §8). Masked text only.
// Every detected item is masked in the stored record, even items the user chose
// to show to the AI. Raw text, real values and the placeholder map are never stored.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import type { Source } from "./ai/source";
import { ensureSignedIn, getDb } from "./firebase";
import { leakCheck, mask, maskWithMap } from "./pii/mask";
import { isPiiType, type PiiItem, type PiiType } from "./pii/types";
import { LeakError } from "./tasks/leak-error";
import type { TaskKind, TaskResult } from "./tasks/types";

export const MAX_MASKED_INPUT_CHARS = 20_000;
const LIST_LIMIT = 100;
const BATCH_SIZE = 450;

export interface HistoryEntry {
  id: string;
  createdAt: Date;
  task: TaskKind;
  maskedInput: string;
  maskedOutput: string;
  itemCounts: Partial<Record<PiiType, number>>;
  source: Source;
  reason: string;
}

export type NewHistoryEntry = Omit<HistoryEntry, "id" | "createdAt">;

/**
 * Builds the record to store. Pure: no network.
 * - masks ALL detected items (enabled or not) in the input and in the answer,
 *   with one shared map so placeholders match between them;
 * - refuses (LeakError) if a strict leakCheck finds anything in either text,
 *   including a date the AI reworded ("10/01/2026" -> "January 10, 2026").
 */
export function prepareHistoryRecord(
  text: string,
  items: PiiItem[],
  task: TaskKind,
  result: Pick<TaskResult, "text" | "source" | "reason">,
): NewHistoryEntry {
  const all = items.map((i) => ({ ...i, enabled: true }));
  const { masked, map } = mask(text, all);
  const maskedOutput = maskWithMap(result.text, map);

  // Strict: anything date-like that survived (e.g. the AI reworded a date) blocks storage.
  const leaks = [
    ...leakCheck(masked, all, { strict: true }).leaks,
    ...leakCheck(maskedOutput, all, { strict: true }).leaks,
  ];
  if (leaks.length > 0) throw new LeakError(leaks);

  const itemCounts: Partial<Record<PiiType, number>> = {};
  for (const item of items) {
    if (item.enabled) itemCounts[item.type] = (itemCounts[item.type] ?? 0) + 1;
  }

  return {
    task,
    maskedInput: masked.slice(0, MAX_MASKED_INPUT_CHARS),
    maskedOutput,
    itemCounts,
    source: result.source,
    reason: result.reason,
  };
}

export interface HistoryStats {
  total: number;
  /** Rounded percentage of tasks that ran on-device. */
  onDevicePct: number;
}

export function computeStats(entries: Pick<HistoryEntry, "source">[]): HistoryStats {
  const total = entries.length;
  const onDevice = entries.filter((e) => e.source === "ON_DEVICE").length;
  return { total, onDevicePct: total === 0 ? 0 : Math.round((onDevice / total) * 100) };
}

async function historyCollection() {
  const user = await ensureSignedIn();
  return collection(getDb(), "users", user.uid, "history");
}

/** Stores a prepared record. Returns the new document id. */
export async function saveResult(record: NewHistoryEntry): Promise<string> {
  const ref = await addDoc(await historyCollection(), { ...record, createdAt: serverTimestamp() });
  return ref.id;
}

const TASKS: readonly TaskKind[] = ["summarise", "rewrite", "translate", "ask"];
const SOURCES: readonly Source[] = ["ON_DEVICE", "IN_CLOUD", "UNKNOWN"];

function toEntry(id: string, data: DocumentData): HistoryEntry {
  const counts: Partial<Record<PiiType, number>> = {};
  for (const [type, n] of Object.entries(data.itemCounts ?? {})) {
    if (isPiiType(type) && typeof n === "number") counts[type] = n;
  }
  return {
    id,
    // A just-written serverTimestamp() can still be null locally.
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    task: TASKS.includes(data.task) ? data.task : "summarise",
    maskedInput: typeof data.maskedInput === "string" ? data.maskedInput : "",
    maskedOutput: typeof data.maskedOutput === "string" ? data.maskedOutput : "",
    itemCounts: counts,
    source: SOURCES.includes(data.source) ? data.source : "UNKNOWN",
    reason: typeof data.reason === "string" ? data.reason : "",
  };
}

/** Newest first, up to 100. */
export async function listResults(): Promise<HistoryEntry[]> {
  const snap = await getDocs(query(await historyCollection(), orderBy("createdAt", "desc"), limit(LIST_LIMIT)));
  return snap.docs.map((d) => toEntry(d.id, d.data()));
}

export async function deleteResult(id: string): Promise<void> {
  await deleteDoc(doc(await historyCollection(), id));
}

/** Deletes every saved result. Returns how many were deleted. */
export async function clearAll(): Promise<number> {
  const snap = await getDocs(await historyCollection());
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(getDb());
    for (const d of snap.docs.slice(i, i + BATCH_SIZE)) batch.delete(d.ref);
    await batch.commit();
  }
  return snap.docs.length;
}
