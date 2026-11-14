import type { TargetLanguage, TaskKind, TaskOptions } from "./types";

/** Required in every prompt so placeholders survive and can be restored on the device. */
export const PLACEHOLDER_RULE = "Keep placeholders like [PERSON_1] exactly as they are.";

/** Models tend to imitate the placeholder style for role words ("[CLIENT]"); forbid it. */
export const NO_NEW_PLACEHOLDERS_RULE =
  "Do not create new placeholders and do not put any other words in square brackets: write role words such as Client or Consultant as normal words.";

export const LANGUAGE_NAMES: Record<TargetLanguage, string> = {
  en: "English",
  fr: "French",
  ar: "Arabic",
};

function instruction(task: TaskKind, options: TaskOptions): string {
  switch (task) {
    case "summarise":
      return "Summarise the document below in 3 to 6 short bullet points, in the same language as the document.";
    case "rewrite":
      return options.style === "simple"
        ? "Rewrite the document below in plain, simple language that anyone can understand. Use short sentences. Keep every fact."
        : "Rewrite the document below in a clear, formal and professional tone. Keep every fact.";
    case "translate": {
      if (!options.language) throw new Error("Choose a language to translate into.");
      const name = LANGUAGE_NAMES[options.language];
      return `Translate the document below into ${name}. Do not translate, transliterate or reorder the placeholders.`;
    }
    case "ask":
      return "Answer the question at the end using only the document below. If the document does not contain the answer, say so.";
  }
}

/** Builds the prompt for a task. `maskedText` (and `options.question`) must already be masked. */
export function buildPrompt(task: TaskKind, maskedText: string, options: TaskOptions): string {
  const question = options.question?.trim() ?? "";
  if (task === "ask" && !question) throw new Error("Type a question first.");

  const lines = [
    instruction(task, options),
    PLACEHOLDER_RULE,
    "Placeholders stand for personal data removed for privacy: do not guess, change or remove them.",
    NO_NEW_PLACEHOLDERS_RULE,
    "Reply with the result only, without an introduction.",
    "",
    "DOCUMENT START",
    maskedText,
    "DOCUMENT END",
  ];
  if (task === "ask") lines.push("", `QUESTION: ${question}`);
  return lines.join("\n");
}
