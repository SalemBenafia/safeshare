import { describe, expect, it } from "vitest";
import { cleanScanItems, hasBirthKeywordNearby, isRoleWord, trimItemText } from "../clean";
import { item } from "./helpers";

const clean = (text: string, ...items: ReturnType<typeof item>[]) =>
  cleanScanItems(text, items).map((i) => ({ text: i.text, type: i.type }));

describe("trimItemText", () => {
  it.each([
    ["+216 22 333 444)", "+216 22 333 444"],
    ["(Leila Mansour)", "Leila Mansour"],
    ["“Olive Data SARL”,", "Olive Data SARL"],
    [" ahmed@example.com. ", "ahmed@example.com"],
  ])("trims %j to %j", (raw, trimmed) => {
    expect(trimItemText(raw)).toBe(trimmed);
  });

  it("keeps the leading + of a phone number", () => {
    expect(trimItemText("+33 6 12 34 56 78")).toBe("+33 6 12 34 56 78");
  });
});

describe("mergeAdjacentAddresses (via cleanScanItems)", () => {
  const addr = (t: string, enabled = true) => item(t, "ADDRESS", { enabled, origin: "ai" });

  it("joins parts separated by commas and spaces", () => {
    const text = "Office: 8 Rue Ibn Khaldoun, 3027 Sfax, Tunisia. Call us.";
    expect(clean(text, addr("8 Rue Ibn Khaldoun"), addr("3027 Sfax"), addr("Tunisia"))).toEqual([
      { text: "8 Rue Ibn Khaldoun, 3027 Sfax, Tunisia", type: "ADDRESS" },
    ]);
  });

  it("joins parts on consecutive lines", () => {
    const text = "Send to:\n12 Rue des Oliviers\n3000 Sfax\nThanks";
    expect(clean(text, addr("12 Rue des Oliviers"), addr("3000 Sfax"))).toEqual([
      { text: "12 Rue des Oliviers\n3000 Sfax", type: "ADDRESS" },
    ]);
  });

  it("keeps a part on its own when it also appears elsewhere", () => {
    const text = "Registered in Tunisia. Office: 3027 Sfax, Tunisia.";
    const texts = clean(text, addr("3027 Sfax"), addr("Tunisia")).map((i) => i.text);
    expect(texts).toEqual(expect.arrayContaining(["3027 Sfax, Tunisia", "Tunisia"]));
    expect(texts).not.toContain("3027 Sfax");
  });

  it("does not join addresses separated by other words", () => {
    const text = "From 8 Rue Ibn Khaldoun to 27 Rue des Lilas.";
    expect(clean(text, addr("8 Rue Ibn Khaldoun"), addr("27 Rue des Lilas")).map((i) => i.text)).toEqual([
      "8 Rue Ibn Khaldoun",
      "27 Rue des Lilas",
    ]);
  });

  it("does not join an address with a neighbouring item of another type", () => {
    const text = "3027 Sfax, Leila Mansour";
    expect(clean(text, addr("3027 Sfax"), item("Leila Mansour", "PERSON")).map((i) => i.text)).toEqual([
      "3027 Sfax",
      "Leila Mansour",
    ]);
  });
});

describe("cleanScanItems", () => {
  it("trims items and gives the trimmed item a new id", () => {
    const text = "Call Karim (+216 22 333 444) today.";
    const [cleaned] = cleanScanItems(text, [item("+216 22 333 444)", "PHONE", { origin: "regex" })]);
    expect(cleaned.text).toBe("+216 22 333 444");
    expect(cleaned.id).toBe(item("+216 22 333 444", "PHONE").id);
  });

  it("merges duplicates created by trimming, keeping the more specific type", () => {
    const text = "Call +216 22 333 444) or +216 22 333 444.";
    expect(clean(text, item("+216 22 333 444)", "OTHER"), item("+216 22 333 444", "PHONE"))).toEqual([
      { text: "+216 22 333 444", type: "PHONE" },
    ]);
  });

  it.each(["Client", "client", "CLIENT", "the Client", "Consultant", "Parties", "Agreement", "Services", "le Prestataire"])(
    "drops the role word %j",
    (word) => {
      expect(isRoleWord(word)).toBe(true);
      expect(clean(`About ${word} here.`, item(word, "OTHER"))).toEqual([]);
    },
  );

  it("keeps real names that contain a role word", () => {
    expect(isRoleWord("Client Services Tunis")).toBe(false);
  });

  it("drops items shorter than 3 characters", () => {
    expect(clean("Mr Al and Bo Li.", item("Al", "PERSON"), item("Bo Li", "PERSON"))).toEqual([
      { text: "Bo Li", type: "PERSON" },
    ]);
  });

  it("keeps ordinary dates as DATE (enabled), whatever type the AI gave them", () => {
    const text = "Signed on 10 January 2026. Ends on 31 July 2026. Due 2026-03-01.";
    const cleaned = cleanScanItems(text, [
      item("10 January 2026", "DATE_OF_BIRTH"),
      item("31 July 2026", "OTHER"),
      item("2026-03-01", "ID_NUMBER"),
    ]);
    expect(cleaned.map((i) => [i.text, i.type, i.enabled])).toEqual([
      ["10 January 2026", "DATE", true],
      ["31 July 2026", "DATE", true],
      ["2026-03-01", "DATE", true],
    ]);
  });

  it.each([
    ["The contract lasts thirty days.", "thirty days"],
    ["Signed in 2026.", "2026"],
    ["See clause 1.2 for details.", "1.2"],
  ])("drops the non-date %j", (text, value) => {
    expect(clean(text, item(value, "DATE"))).toEqual([]);
    expect(clean(text, item(value, "DATE_OF_BIRTH"))).toEqual([]);
  });

  it("drops a plain year whatever its type", () => {
    expect(clean("Founded in 2016.", item("2016", "OTHER"))).toEqual([]);
  });

  it("keeps a date with a birth keyword nearby, as DATE_OF_BIRTH", () => {
    const text = "Claire Dubois, born on 22 September 1988, French passport.";
    expect(clean(text, item("22 September 1988", "OTHER"))).toEqual([{ text: "22 September 1988", type: "DATE_OF_BIRTH" }]);
  });

  it.each(["DOB: 01/02/1990", "Date of birth - 01/02/1990", "née le 01/02/1990", "né le 01/02/1990"])(
    "accepts the keyword in %j",
    (text) => {
      expect(hasBirthKeywordNearby(text, "01/02/1990")).toBe(true);
    },
  );

  it("applies a birth keyword only to the first date after it", () => {
    const text = "Patient born on 2 May 1985, admitted on 3 June 2026.";
    expect(hasBirthKeywordNearby(text, "2 May 1985")).toBe(true);
    expect(hasBirthKeywordNearby(text, "3 June 2026")).toBe(false);
  });

  it("ignores a birth keyword that is too far away", () => {
    const text = `Born in Tunis. ${"Lots of unrelated words in between here. ".repeat(2)}Signed 01/02/1990.`;
    expect(hasBirthKeywordNearby(text, "01/02/1990")).toBe(false);
  });

  it("downgrades a DATE_OF_BIRTH without a birth keyword to DATE", () => {
    expect(clean("Visit on 4 May 2026.", item("4 May 2026", "DATE_OF_BIRTH"))).toEqual([{ text: "4 May 2026", type: "DATE" }]);
    expect(clean("Meeting in spring 2026.", item("spring 2026", "DATE_OF_BIRTH"))).toEqual([{ text: "spring 2026", type: "DATE" }]);
  });

  it.each(["Olive Data SARL", "Medina Soft SA", "Acme Ltd", "Acme Ltd.", "Globex Inc", "Muster GmbH", "Initech LLC", "Exemple S.A."])(
    "relabels the organisation %j from PERSON to OTHER",
    (org) => {
      const text = `Contract with ${org} today.`;
      expect(clean(text, item(trimItemText(org), "PERSON"))[0]).toEqual({ text: trimItemText(org), type: "OTHER" });
    },
  );

  it("does not relabel people whose name merely contains those letters", () => {
    expect(clean("Lisa Sarlo signed.", item("Lisa Sarlo", "PERSON"))).toEqual([{ text: "Lisa Sarlo", type: "PERSON" }]);
  });

  it("drops items that are not in the text after trimming", () => {
    expect(clean("Nothing relevant.", item("Ghost Name", "PERSON"))).toEqual([]);
  });

  it("leaves valid items untouched (same object)", () => {
    const valid = item("Leila Mansour", "PERSON");
    expect(cleanScanItems("Ms Leila Mansour signs.", [valid])[0]).toBe(valid);
  });
});
