// Shared text helpers for scanning, masking and leak checks.

const WORD_CHAR = /[\p{L}\p{N}]/u;

export function isWordChar(char: string | undefined): boolean {
  return char !== undefined && WORD_CHAR.test(char);
}

/**
 * Start offsets of every exact occurrence of `value` in `text` that sits on a
 * word boundary: if the value starts (or ends) with a letter/digit, the
 * neighbouring character must not be a letter/digit. "Ali" does not match in "Alice".
 */
export function findOccurrences(text: string, value: string): number[] {
  if (!value) return [];
  const starts: number[] = [];
  const checkStart = isWordChar(value[0]);
  const checkEnd = isWordChar(value[value.length - 1]);
  let from = 0;
  while (from <= text.length - value.length) {
    const at = text.indexOf(value, from);
    if (at === -1) break;
    const end = at + value.length;
    const okStart = !checkStart || !isWordChar(text[at - 1]);
    const okEnd = !checkEnd || !isWordChar(text[end]);
    if (okStart && okEnd) starts.push(at);
    from = at + 1;
  }
  return starts;
}

export interface Span {
  start: number;
  end: number;
}

export function overlaps(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Keeps non-overlapping spans, preferring longer ones (then earlier ones).
 * Returns them sorted by position.
 */
export function claimLongestFirst<T extends Span>(spans: T[]): T[] {
  const ordered = [...spans].sort(
    (a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start,
  );
  const kept: T[] = [];
  for (const span of ordered) {
    if (!kept.some((k) => overlaps(k, span))) kept.push(span);
  }
  return kept.sort((a, b) => a.start - b.start);
}
