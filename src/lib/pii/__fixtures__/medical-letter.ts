// INVENTED sample data. Every name, number and address below is fictional.
// 4111 1111 1111 1111 is a well-known public test card number.
import type { PiiType } from "../types";

export const letterText = `Clinique des Jasmins (fictional) - Dr Yasmine Trabelsi
Avenue Habib Bourguiba 45, 1001 Tunis · Tel. 71 234 567

Paris, 3 June 2026

Dear colleague,

I am writing about my patient Julien Moreau, born on 2 May 1985, patient file no. PF-2026-00417.
Mr Moreau was diagnosed with type 2 diabetes in 2021. Julien Moreau reports good adherence to metformin.

He can be reached at julien.moreau@example.fr or 06 11 22 33 44.

Consultation fee paid by card 4111 1111 1111 1111 (order 2026-118).

Kind regards,
Dr Yasmine Trabelsi
`;

/** What the regex scanner alone must find in letterText. */
export const letterExpectedRegex: ReadonlyArray<{ type: PiiType; text: string }> = [
  { type: "PHONE", text: "71 234 567" },
  { type: "DATE_OF_BIRTH", text: "2 May 1985" },
  { type: "EMAIL", text: "julien.moreau@example.fr" },
  { type: "PHONE", text: "06 11 22 33 44" },
  { type: "BANK", text: "4111 1111 1111 1111" },
];

export const letterNames = ["Yasmine Trabelsi", "Julien Moreau"] as const;
