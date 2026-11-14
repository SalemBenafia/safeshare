import type { Leak } from "../pii/mask";

/** Thrown before any model call when personal data is still visible. */
export class LeakError extends Error {
  readonly leaks: Leak[];

  constructor(leaks: Leak[]) {
    // Counts only: the message must never contain the personal values.
    super(`Blocked: ${leaks.length} personal item(s) still visible. Nothing was sent.`);
    this.name = "LeakError";
    this.leaks = leaks;
  }
}
