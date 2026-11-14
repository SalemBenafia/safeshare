import { notImplemented } from "../notImplemented";
import type { TaskKind, TaskOptions } from "./types";

/** Builds the prompt for a task. Input must already be masked. */
export function buildPrompt(
  task: TaskKind,
  maskedText: string,
  options: TaskOptions,
): string {
  void task;
  void maskedText;
  void options;
  return notImplemented("buildPrompt");
}
