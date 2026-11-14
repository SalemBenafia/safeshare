// The "Ask" question is typed by the user, so it is scanned on the device too.
import { leakCheck, maskWithMap, type LeakReport } from "../pii/mask";
import type { PiiItem, PlaceholderMap } from "../pii/types";

export interface CheckedQuestion {
  /** The question with the document's placeholders applied. */
  masked: string;
  report: LeakReport;
}

/**
 * Masks the question with the document's map (any case, name parts included),
 * then checks it against the personal items found IN THE QUESTION itself
 * (on-device scan). Anything still visible blocks the task.
 */
export function checkQuestion(question: string, map: PlaceholderMap, questionItems: PiiItem[]): CheckedQuestion {
  const masked = maskWithMap(question.trim(), map);
  const found = questionItems.map((i) => ({ ...i, enabled: true }));
  return { masked, report: leakCheck(masked, found) };
}
