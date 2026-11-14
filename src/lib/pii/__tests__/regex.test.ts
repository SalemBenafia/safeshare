import { describe, expect, it } from "vitest";
import { cvExpectedRegex, cvText } from "../__fixtures__/cv";
import { letterExpectedRegex, letterText } from "../__fixtures__/medical-letter";
import { scanWithRegex } from "../scan";

const found = (text: string) => scanWithRegex(text).map(({ type, text: t }) => ({ type, text: t }));

describe("scanWithRegex: positives", () => {
  it("finds emails", () => {
    expect(found("Write to nour.haddad@example.tn today.")).toEqual([
      { type: "EMAIL", text: "nour.haddad@example.tn" },
    ]);
  });

  it.each([
    "+216 98 765 432",
    "+216 71 234 567",
    "+216-22-333-444",
    "+33 6 12 34 56 78",
    "+44 20 7946 0958",
    "+1 (555) 010-0199",
  ])("finds the international phone %s", (phone) => {
    expect(found(`Call ${phone} now.`)).toEqual([{ type: "PHONE", text: phone }]);
  });

  it.each(["06 11 22 33 44", "01.23.45.67.89", "98 765 432", "71 234 567"])(
    "finds the national phone %s",
    (phone) => {
      expect(found(`Tel: ${phone}.`)).toEqual([{ type: "PHONE", text: phone }]);
    },
  );

  it.each(["TN59 0401 8104 0049 1234 5678", "FR14 2004 1010 0505 0001 3M02 606", "DE89370400440532013000"])(
    "finds the IBAN-like number %s",
    (iban) => {
      expect(found(`IBAN: ${iban}`)).toEqual([{ type: "BANK", text: iban }]);
    },
  );

  it.each(["4111 1111 1111 1111", "5500-0000-0000-0004", "4012888888881881"])(
    "finds the Luhn-valid card number %s",
    (card) => {
      expect(found(`Card ${card} on file.`)).toEqual([{ type: "BANK", text: card }]);
    },
  );

  it.each([
    ["Date of birth: 14/03/1991", "14/03/1991"],
    ["DOB 1991-03-14", "1991-03-14"],
    ["born on 2 May 1985 in Tunis", "2 May 1985"],
    ["Born March 12, 1990.", "March 12, 1990"],
    ["née le 12 mars 1990", "12 mars 1990"],
    ["Date de naissance : 01.02.1988", "01.02.1988"],
    ["birth date - 5-11-2001", "5-11-2001"],
  ])("finds the date of birth in %j", (text, date) => {
    expect(found(text)).toEqual([{ type: "DATE_OF_BIRTH", text: date }]);
  });
});

describe("scanWithRegex: brackets", () => {
  it.each([
    ["(+216 22 333 444)", "+216 22 333 444"],
    ["Karim (karim@example.com, +216 22 333 444).", "+216 22 333 444"],
    ["Call +1 (555) 010-0199)", "+1 (555) 010-0199"],
  ])("does not swallow the closing bracket in %j", (text, phone) => {
    expect(found(text).filter((f) => f.type === "PHONE")).toEqual([{ type: "PHONE", text: phone }]);
  });
});

describe("scanWithRegex: ordinary dates", () => {
  it.each([
    "10 January 2026",
    "January 10, 2026",
    "10/01/2026",
    "2026-01-10",
    "10.01.2026",
    "10 janvier 2026",
    "1er février 2026",
    "Jan. 10, 2026",
  ])("finds %j as DATE", (date) => {
    expect(found(`The appointment is on ${date}, at noon.`)).toEqual([{ type: "DATE", text: date }]);
  });

  it("treats a date without a birth keyword as DATE, not DATE_OF_BIRTH", () => {
    expect(found("The meeting is on 14/03/1991 at noon.")).toEqual([{ type: "DATE", text: "14/03/1991" }]);
  });

  it("uses DATE_OF_BIRTH when a birth keyword is within about 30 characters before", () => {
    expect(found("Leila, née le 3 avril 1979, signs on 10 janvier 2026.")).toEqual([
      { type: "DATE_OF_BIRTH", text: "3 avril 1979" },
      { type: "DATE", text: "10 janvier 2026" },
    ]);
  });

  it.each([
    "The contract lasts thirty days.",
    "Signed in 2026.",
    "See clause 1.2 and 3.1.",
    "Upgrade to version 2.4.1 or 10.0.19045.",
    "Order 2026-118 shipped in 2021.",
    "Not a date: 32/13/2026.",
    "Years 2016–2019 and 2019–2024.",
  ])("finds no date in %j", (text) => {
    expect(found(text).filter((f) => f.type === "DATE" || f.type === "DATE_OF_BIRTH")).toEqual([]);
  });
});

describe("scanWithRegex: conservative (no false positives)", () => {
  it.each([
    "Order 2026-118 shipped in 2021.",
    "Upgrade to version 2.4.1 or 10.0.19045.",
    "Card 4111 1111 1111 1112 is not valid.",
    "Invoice total: 1 234 567 dinars.",
    "Room 12, floor 3, building 45.",
    "Years 2016–2019 and 2019–2024.",
    "Reference ABCD1234 and code XY12.",
  ])("finds nothing in %j", (text) => {
    expect(found(text)).toEqual([]);
  });
});

describe("scanWithRegex: items", () => {
  it("returns enabled regex items with stable ids, deduplicated", () => {
    const items = scanWithRegex("a@example.com and again a@example.com");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ text: "a@example.com", enabled: true, origin: "regex" });
    expect(scanWithRegex("a@example.com")[0].id).toBe(items[0].id);
  });

  it("finds everything expected in the fake CV", () => {
    expect(found(cvText)).toEqual(expect.arrayContaining([...cvExpectedRegex]));
    expect(found(cvText)).toHaveLength(cvExpectedRegex.length);
  });

  it("finds everything expected in the fake medical letter", () => {
    expect(found(letterText)).toEqual(expect.arrayContaining([...letterExpectedRegex]));
    expect(found(letterText)).toHaveLength(letterExpectedRegex.length);
  });
});
