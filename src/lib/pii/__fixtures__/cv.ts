// INVENTED sample data. Every name, number and address below is fictional.
import type { PiiType } from "../types";

export const cvText = `Ahmed Ben Ali
Software engineer · Sfax, Tunisia

Contact: ahmed.benali@example.com · +216 98 765 432
Address: 12 Rue des Oliviers, 3000 Sfax
Date of birth: 14/03/1991

Experience
2019–2024: Backend developer at Olive Data (fictional company), Sfax. Ahmed led a team of four.
2016–2019: Junior developer at Medina Soft (fictional), Tunis. Version 2.4.1 of the billing API shipped in 2018.

Salary account (for HR only): TN59 0401 8104 0049 1234 5678

References
Claire Dubois, team lead, claire.dubois@example.org, +33 6 12 34 56 78
Oliver Bennett, mentor, oliver.bennett@example.net
`;

/** What the regex scanner alone must find in cvText. */
export const cvExpectedRegex: ReadonlyArray<{ type: PiiType; text: string }> = [
  { type: "EMAIL", text: "ahmed.benali@example.com" },
  { type: "PHONE", text: "+216 98 765 432" },
  { type: "DATE_OF_BIRTH", text: "14/03/1991" },
  { type: "BANK", text: "TN59 0401 8104 0049 1234 5678" },
  { type: "EMAIL", text: "claire.dubois@example.org" },
  { type: "PHONE", text: "+33 6 12 34 56 78" },
  { type: "EMAIL", text: "oliver.bennett@example.net" },
];

export const cvNames = ["Ahmed Ben Ali", "Claire Dubois", "Oliver Bennett"] as const;
export const cvAddress = "12 Rue des Oliviers, 3000 Sfax";
