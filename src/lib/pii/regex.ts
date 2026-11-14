// Conservative regex scanner. Runs on-device; used alone when Gemini Nano is unavailable.
import { claimLongestFirst } from "./text";
import { itemId, type PiiItem, type PiiType } from "./types";

interface Rule {
  type: PiiType;
  pattern: RegExp;
  /** Index of the capture group holding the item; 0 = whole match. Must end the match. */
  group?: number;
  valid?: (text: string) => boolean;
}

const digitsOf = (s: string) => s.replace(/\D/g, "");

function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "janvier", "février", "fevrier", "mars", "avril", "mai", "juin", "juillet",
  "août", "aout", "septembre", "octobre", "novembre", "décembre", "decembre",
  "sept", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
].join("|");

const YEAR = String.raw`(?:19|20)\d{2}`;
const DATE = [
  String.raw`\d{1,2}[/.-]\d{1,2}[/.-]${YEAR}`,
  String.raw`${YEAR}-\d{2}-\d{2}`,
  String.raw`\d{1,2}(?:er|st|nd|rd|th)?\s+(?:${MONTHS})\.?\s+${YEAR}`,
  String.raw`(?:${MONTHS})\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+${YEAR}`,
].join("|");
const DOB_KEYWORD = String.raw`(?:date\s+of\s+birth|birth\s*date|date\s+de\s+naissance|d\.?o\.?b\.?|born|née|né)`;

const RULES: Rule[] = [
  {
    type: "EMAIL",
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
  },
  {
    // International: +CC then 2-6 groups; 8-15 digits in total.
    type: "PHONE",
    pattern: /(?<![\w+])\+\d{1,3}(?:[ .-]?\(?\d{1,4}\)?){2,6}(?!\d)/g,
    valid: (t) => digitsOf(t).length >= 8 && digitsOf(t).length <= 15,
  },
  {
    // French national: 0X XX XX XX XX (separators required).
    type: "PHONE",
    pattern: /(?<![\d+.-])0[1-9](?:[ .-]\d{2}){4}(?![\d.-]?\d)/g,
  },
  {
    // Tunisian national: XX XXX XXX starting with 2, 4, 5, 7 or 9 (separators required).
    type: "PHONE",
    pattern: /(?<![\d+.-])[24579]\d[ .]\d{3}[ .]\d{3}(?![\d.-]?\d)/g,
  },
  {
    // IBAN-like: country letters + check digits + 11-30 alphanumerics.
    type: "BANK",
    pattern: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?\b/g,
    valid: (t) => {
      const compact = t.replace(/ /g, "");
      return compact.length >= 15 && compact.length <= 34 && digitsOf(compact).length >= 10;
    },
  },
  {
    // Card-like: 4-digit groups or one block of 13-19 digits, Luhn-valid.
    type: "BANK",
    pattern: /(?<![\d-])(?:\d{4}[ -]){3}\d{1,7}(?![\d-])|(?<![\d-])\d{13,19}(?![\d-])/g,
    valid: (t) => {
      const d = digitsOf(t);
      return d.length >= 13 && d.length <= 19 && luhn(d);
    },
  },
  {
    // A date shortly after "born", "DOB", "date of birth", "né(e)", ...
    type: "DATE_OF_BIRTH",
    pattern: new RegExp(
      String.raw`(?<!\p{L})${DOB_KEYWORD}(?!\p{L})[^\n\d]{0,25}?(${DATE})(?![\p{L}\p{N}])`,
      "giu",
    ),
    group: 1,
  },
];

interface Hit {
  start: number;
  end: number;
  text: string;
  type: PiiType;
}

/** Finds emails, phones, IBAN/card numbers and dates of birth. Conservative on purpose. */
export function scanWithRegex(text: string): PiiItem[] {
  const hits: Hit[] = [];
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    for (const m of text.matchAll(rule.pattern)) {
      const value = m[rule.group ?? 0];
      if (!value || (rule.valid && !rule.valid(value))) continue;
      const end = (m.index ?? 0) + m[0].length;
      hits.push({ start: end - value.length, end, text: value, type: rule.type });
    }
  }

  const items: PiiItem[] = [];
  const seen = new Set<string>();
  for (const hit of claimLongestFirst(hits)) {
    if (seen.has(hit.text)) continue;
    seen.add(hit.text);
    items.push({ id: itemId(hit.text), text: hit.text, type: hit.type, enabled: true, origin: "regex" });
  }
  return items;
}
