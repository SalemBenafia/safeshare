import type { Source } from "../ai/source";

export type TaskKind = "summarise" | "rewrite" | "translate" | "ask";

export type RewriteStyle = "formal" | "simple";
export type TargetLanguage = "en" | "fr" | "ar";

export interface TaskOptions {
  style?: RewriteStyle;
  language?: TargetLanguage;
  question?: string;
}

export interface Route {
  target: "hybrid" | "cloud";
  /** Shown to the user, e.g. "Long document -> cloud". */
  reason: string;
}

export interface TaskResult {
  /** Unmasked answer, shown on screen only. */
  text: string;
  maskedText: string;
  source: Source;
  reason: string;
  maskedChars: number;
}
