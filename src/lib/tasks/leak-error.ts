import type { Leak } from "../pii/mask";

/** Thrown before any model call when personal data is still visible. */
export class LeakError extends Error {
  readonly leaks: Leak[];
  /** Where the personal data was found: the masked document/prompt, or the user's question. */
  readonly where: "document" | "question";

  constructor(leaks: Leak[], where: "document" | "question" = "document") {
    // Counts only: the message must never contain the personal values.
    super(`Blocked: ${leaks.length} personal item(s) still visible. Nothing was sent.`);
    this.name = "LeakError";
    this.leaks = leaks;
    this.where = where;
  }
}
