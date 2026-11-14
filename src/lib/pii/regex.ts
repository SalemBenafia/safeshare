// Conservative regex scanner. Runs on-device; used alone when Gemini Nano is unavailable.
import { classifyDate, DATE, isValidDate } from "./dates";
import { claimLongestFirst } from "./text";
import { itemId, type PiiItem, type PiiType } from "./types";

interface Rule {
  type: PiiType;
  pattern: RegExp;
  valid?: (value: string) => boolean;
  /** Decides the type from context (used for dates). */
  classify?: (text: string, value: string) => PiiType;
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

const RULES: Rule[] = [
  {
    type: "EMAIL",
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
  },
  {
    // International: +CC then 2-6 groups; 8-15 digits in total.
    // Brackets must be paired, e.g. "(555)", so a closing ")" after the number is never swallowed.
    type: "PHONE",
    pattern: /(?<![\w+])\+\d{1,3}(?:[ .-]?(?:\(\d{1,4}\)|\d{1,4})){2,6}(?!\d)/g,
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
    // Full dates: DATE_OF_BIRTH with a birth keyword nearby, DATE otherwise.
    // Guards keep "10.0.19045", "1.2" and plain years out.
    type: "DATE",
    pattern: new RegExp(String.raw`(?<![\p{L}\p{N}./-])(?:${DATE})(?![\p{L}\p{N}]|[./-]\d)`, "giu"),
    valid: isValidDate,
    classify: classifyDate,
  },
];

interface Hit {
  start: number;
  end: number;
  text: string;
  type: PiiType;
}

/** Finds emails, phones, IBAN/card numbers and dates. Conservative on purpose. */
export function scanWithRegex(text: string): PiiItem[] {
  const hits: Hit[] = [];
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    for (const m of text.matchAll(rule.pattern)) {
      const value = m[0];
      if (!value || (rule.valid && !rule.valid(value))) continue;
      const start = m.index ?? 0;
      const type = rule.classify ? rule.classify(text, value) : rule.type;
      hits.push({ start, end: start + value.length, text: value, type });
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
