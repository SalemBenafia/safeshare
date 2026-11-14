// Browser-only. Runs a task: leakCheck -> model (hybrid or cloud) -> stream -> unmask.
import { cloudModel, hybridModel } from "../ai/models";
import { toSource } from "../ai/source";
import { leakCheck, removeInventedPlaceholders, unmask } from "../pii/mask";
import type { PiiItem, PlaceholderMap } from "../pii/types";
import { LeakError } from "./leak-error";
import { buildPrompt } from "./prompts";
import type { Route, TaskKind, TaskOptions, TaskResult } from "./types";

export { LeakError };

export interface RunTaskInput {
  task: TaskKind;
  options: TaskOptions;
  maskedText: string;
  items: PiiItem[];
  /** In memory only. */
  map: PlaceholderMap;
  route: Route;
  /** Called with the UNMASKED answer so far, on every streamed chunk. */
  onUpdate?: (textSoFar: string) => void;
}

/** Hides a placeholder that is still arriving ("[PERS") so it never flashes on screen. */
function withoutTrailingPartial(text: string): string {
  return text.replace(/\[[A-Z_]*\d*$/, "");
}

/**
 * Checks the full prompt for leaks FIRST; if anything leaks, throws LeakError
 * and calls no model. Otherwise streams the answer and unmasks it on the device.
 */
export async function runTask(input: RunTaskInput): Promise<TaskResult> {
  const { task, options, maskedText, items, map, route, onUpdate } = input;
  const prompt = buildPrompt(task, maskedText, options);

  const report = leakCheck(prompt, items);
  if (!report.ok) throw new LeakError(report.leaks);

  const model = route.target === "cloud" ? cloudModel() : hybridModel();
  const result = await model.generateContentStream(prompt);

  let accumulated = "";
  for await (const chunk of result.stream) {
    accumulated += chunk.text();
    // Unmask the whole text each time: a placeholder may be split across chunks.
    // Invented "[CLIENT]" tokens are fixed BEFORE unmasking, so real values are never altered.
    onUpdate?.(unmask(removeInventedPlaceholders(withoutTrailingPartial(accumulated)), map));
  }
  const final = await result.response;

  return {
    text: unmask(removeInventedPlaceholders(accumulated), map),
    maskedText: accumulated,
    source: toSource(final.inferenceSource),
    reason: route.reason,
    maskedChars: prompt.length,
  };
}
