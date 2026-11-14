import type { Source } from "../ai/source";

export type TaskKind = "summarise" | "rewrite" | "translate" | "ask";

export type RewriteStyle = "formal" | "simple";
export type TargetLanguage = "en" | "fr" | "ar";

export interface TaskOptions {
  style?: RewriteStyle;
  language?: TargetLanguage;
  /** For "ask": the question, ALREADY MASKED with the document's placeholders. */
  question?: string;
}

export interface Route {
  target: "hybrid" | "cloud";
  /** Shown to the user, e.g. "Long document (4,210 characters) → cloud". */
  reason: string;
}

export interface TaskResult {
  /** Unmasked answer. Shown on screen only, on this device. */
  text: string;
  /** The answer exactly as the model returned it (placeholders, no real values). */
  maskedText: string;
  source: Source;
  reason: string;
  /** Number of characters in the prompt that was sent to the model. */
  maskedChars: number;
}
