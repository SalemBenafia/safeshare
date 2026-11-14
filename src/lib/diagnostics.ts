// Where the last answer ran, for the Diagnostics panel. Session only.
// Holds the source, the routing reason and a time: never document text.
import type { Source } from "./ai/source";

export interface LastAnswer {
  source: Source;
  reason: string;
  /** ISO time. */
  at: string;
}

const KEY = "safeshare.lastAnswer";
const listeners = new Set<() => void>();
let cached: LastAnswer | null | undefined;

function read(): LastAnswer | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<LastAnswer>;
    return typeof v.source === "string" && typeof v.reason === "string" && typeof v.at === "string"
      ? { source: v.source as Source, reason: v.reason, at: v.at }
      : null;
  } catch {
    return null;
  }
}

/** Stable snapshot for useSyncExternalStore. */
export function getLastAnswer(): LastAnswer | null {
  if (cached === undefined) cached = read();
  return cached;
}

export function recordLastAnswer(source: Source, reason: string, at = new Date()): void {
  cached = { source, reason, at: at.toISOString() };
  try {
    globalThis.sessionStorage?.setItem(KEY, JSON.stringify(cached));
  } catch {
    // Storage blocked: the in-memory value still covers this page.
  }
  for (const l of listeners) l();
}

export function subscribeLastAnswer(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** For tests only. */
export function resetLastAnswerForTests(): void {
  cached = undefined;
  listeners.clear();
}
