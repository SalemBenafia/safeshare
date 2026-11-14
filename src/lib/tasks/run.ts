// Browser-only. Runs a task end to end: leakCheck -> route -> stream -> unmask.
import { notImplemented } from "../notImplemented";
import type { PiiItem, PlaceholderMap } from "../pii/types";
import type { Route, TaskKind, TaskOptions, TaskResult } from "./types";

export interface RunTaskInput {
  task: TaskKind;
  options: TaskOptions;
  maskedText: string;
  items: PiiItem[];
  /** In memory only. */
  map: PlaceholderMap;
  route: Route;
  /** Called with the unmasked answer so far, while it streams. */
  onChunk?: (textSoFar: string) => void;
}

/** Streams the answer and returns the final result. Throws if leakCheck fails. */
export async function runTask(input: RunTaskInput): Promise<TaskResult> {
  void input;
  return notImplemented("runTask");
}
