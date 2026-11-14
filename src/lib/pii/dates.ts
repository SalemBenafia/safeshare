// Date detection shared by the regex scanner and the post-scan clean-up.
// Full dates are personal data: DATE_OF_BIRTH with a birth keyword nearby, DATE otherwise.
// Plain years, durations and clause numbers are NOT dates.
import { findOccurrences } from "./text";

const MONTHS = [
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "janvier", "février", "fevrier", "mars", "avril", "mai", "juin", "juillet",
  "août", "aout", "septembre", "octobre", "novembre", "décembre", "decembre",
  "sept", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
].join("|");

const YEAR = String.raw`(?:19|20)\d{2}`;

/**
 * Date formats: "10/01/2026", "10.01.2026", "10-01-2026", "2026-01-10",
 * "10 January 2026", "1er janvier 2026", "January 10, 2026".
 */
export const DATE = [
  String.raw`\d{1,2}[/.-]\d{1,2}[/.-]${YEAR}`,
  String.raw`${YEAR}-\d{2}-\d{2}`,
  String.raw`\d{1,2}(?:er|st|nd|rd|th)?\s+(?:${MONTHS})\.?\s+${YEAR}`,
  String.raw`(?:${MONTHS})\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+${YEAR}`,
].join("|");

/** Words that mark a date as a date of birth. */
export const DOB_KEYWORD = String.raw`(?:date\s+of\s+birth|birth\s*date|date\s+de\s+naissance|d\.?o\.?b\.?|born|née\s+le|né\s+le|née|né)`;

const DATE_ONLY = new RegExp(`^(?:${DATE})$`, "iu");
const BIRTH_KEYWORD = new RegExp(String.raw`(?<!\p{L})${DOB_KEYWORD}(?!\p{L})`, "iu");
const KEYWORD_WINDOW = 30;

/** Checks day and month ranges, so "32/13/2026" is not a date. */
export function isValidDate(value: string): boolean {
  const numeric = /^(\d{1,2})[/.-](\d{1,2})[/.-]\d{4}$/.exec(value);
  if (numeric) {
    const [a, b] = [Number(numeric[1]), Number(numeric[2])];
    // Day-first (10/01/2026) or month-first (01/31/2026).
    return a >= 1 && b >= 1 && ((a <= 31 && b <= 12) || (a <= 12 && b <= 31));
  }
  const iso = /^\d{4}-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    const [m, d] = [Number(iso[1]), Number(iso[2])];
    return m >= 1 && m <= 12 && d >= 1 && d <= 31;
  }
  const day = /(?<!\d)(\d{1,2})(?!\d)/.exec(value);
  return !day || (Number(day[1]) >= 1 && Number(day[1]) <= 31);
}

/** True if `value` is exactly one full, valid date. */
export function isDateText(value: string): boolean {
  return DATE_ONLY.test(value) && isValidDate(value);
}

const ANY_DATE = new RegExp(DATE, "giu");

/**
 * True if a birth keyword appears within ~30 characters before any occurrence
 * of `value`, with no other date in between: in "née le 3 avril 1979, signs
 * on 10 janvier 2026" only the first date is a date of birth.
 */
export function hasBirthKeywordNearby(text: string, value: string): boolean {
  return findOccurrences(text, value).some((start) => {
    let before = text.slice(Math.max(0, start - KEYWORD_WINDOW), start);
    let lastDateEnd = -1;
    for (const m of before.matchAll(ANY_DATE)) lastDateEnd = (m.index ?? 0) + m[0].length;
    if (lastDateEnd >= 0) before = before.slice(lastDateEnd);
    return BIRTH_KEYWORD.test(before + value);
  });
}

export function classifyDate(text: string, value: string): "DATE_OF_BIRTH" | "DATE" {
  return hasBirthKeywordNearby(text, value) ? "DATE_OF_BIRTH" : "DATE";
}
