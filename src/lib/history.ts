// Browser-only. Saved results in users/{uid}/history (SPEC §8). Masked text only.
import type { Source } from "./ai/source";
import { notImplemented } from "./notImplemented";
import type { PiiType } from "./pii/types";
import type { TaskKind } from "./tasks/types";

export const MAX_MASKED_INPUT_CHARS = 20_000;

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

export async function saveResult(entry: NewHistoryEntry): Promise<string> {
  void entry;
  return notImplemented("saveResult");
}

export async function listResults(): Promise<HistoryEntry[]> {
  return notImplemented("listResults");
}

export async function deleteResult(id: string): Promise<void> {
  void id;
  return notImplemented("deleteResult");
}

export async function clearAll(): Promise<void> {
  return notImplemented("clearAll");
}
