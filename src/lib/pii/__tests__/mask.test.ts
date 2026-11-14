import { describe, expect, it } from "vitest";
import { cvAddress, cvNames, cvText } from "../__fixtures__/cv";
import { letterNames, letterText } from "../__fixtures__/medical-letter";
import { leakCheck, mask, unmask } from "../mask";
import { mergeItems, scanWithRegex } from "../scan";
import { item } from "./helpers";

describe("mask", () => {
  it("replaces enabled items with numbered placeholders", () => {
    const { masked, map } = mask("Hi Sami Gharbi, mail sami@example.com", [
      item("Sami Gharbi", "PERSON"),
      item("sami@example.com", "EMAIL"),
    ]);
    expect(masked).toBe("Hi [PERSON_1], mail [EMAIL_1]");
    expect(map.get("[PERSON_1]")).toBe("Sami Gharbi");
    expect(map.get("[EMAIL_1]")).toBe("sami@example.com");
  });

  it("handles overlapping items: the longer one wins, the short one still masks elsewhere", () => {
    const text = "Ahmed Ben Ali joined in 2019. Later, Ahmed led the team.";
    const { masked, map } = mask(text, [item("Ahmed", "PERSON"), item("Ahmed Ben Ali", "PERSON")]);
    expect(masked).toBe("[PERSON_1] joined in 2019. Later, [PERSON_2] led the team.");
    expect(map.get("[PERSON_1]")).toBe("Ahmed Ben Ali");
    expect(map.get("[PERSON_2]")).toBe("Ahmed");
  });

  it("gives a repeated value the same placeholder every time", () => {
    const text = "Leila Mansour wrote this. Ask Leila Mansour, not Marc Petit. Leila Mansour agrees.";
    const { masked, map } = mask(text, [item("Leila Mansour", "PERSON"), item("Marc Petit", "PERSON")]);
    expect(masked).toBe("[PERSON_1] wrote this. Ask [PERSON_1], not [PERSON_2]. [PERSON_1] agrees.");
    expect(map.size).toBe(2);
  });

  it("leaves disabled items untouched", () => {
    const { masked, map } = mask("Emma Clark lives in Tunis.", [
      item("Emma Clark", "PERSON"),
      item("Tunis", "ADDRESS", { enabled: false }),
    ]);
    expect(masked).toBe("[PERSON_1] lives in Tunis.");
    expect([...map.values()]).toEqual(["Emma Clark"]);
  });

  it("only matches whole words", () => {
    const { masked } = mask("Ali met Alice and Khalil.", [item("Ali", "PERSON")]);
    expect(masked).toBe("[PERSON_1] met Alice and Khalil.");
  });

  it("numbers each type separately, in order of appearance", () => {
    const { masked } = mask("B b@example.com A a@example.com", [
      item("a@example.com", "EMAIL"),
      item("b@example.com", "EMAIL"),
    ]);
    expect(masked).toBe("B [EMAIL_1] A [EMAIL_2]");
  });

  it("skips placeholder numbers that already appear in the source text", () => {
    const text = "Template uses [PERSON_1]. Signed: Rania Saidi.";
    const { masked, map } = mask(text, [item("Rania Saidi", "PERSON")]);
    expect(masked).toBe("Template uses [PERSON_1]. Signed: [PERSON_2].");
    expect(map.has("[PERSON_1]")).toBe(false);
    expect(unmask(masked, map)).toBe(text);
  });

  it("returns the text unchanged with no items", () => {
    expect(mask("Nothing here.", []).masked).toBe("Nothing here.");
  });
});

describe("unmask", () => {
  const map = new Map([
    ["[PERSON_1]", "Ahmed Ben Ali"],
    ["[EMAIL_1]", "ahmed.benali@example.com"],
  ]);

  it("restores bracketed placeholders", () => {
    expect(unmask("Dear [PERSON_1], see [EMAIL_1].", map)).toBe(
      "Dear Ahmed Ben Ali, see ahmed.benali@example.com.",
    );
  });

  it("restores a placeholder that lost its brackets, as a whole word only", () => {
    expect(unmask("Dear PERSON_1, thanks.", map)).toBe("Dear Ahmed Ben Ali, thanks.");
    expect(unmask("PERSON_10 and XPERSON_1 and PERSON_1A", map)).toBe(
      "PERSON_10 and XPERSON_1 and PERSON_1A",
    );
  });

  it("leaves unknown placeholders alone", () => {
    expect(unmask("Hello [PERSON_9] and PHONE_1.", map)).toBe("Hello [PERSON_9] and PHONE_1.");
  });

  it("does not re-scan restored values", () => {
    const tricky = new Map([
      ["[PERSON_1]", "PERSON_2"],
      ["[PERSON_2]", "Should not appear"],
    ]);
    expect(unmask("[PERSON_1]", tricky)).toBe("PERSON_2");
  });
});

describe("mask/unmask round trip", () => {
  it.each([
    ["CV", cvText, [...cvNames, cvAddress]],
    ["medical letter", letterText, [...letterNames, "type 2 diabetes"]],
  ])("restores the %s exactly", (_name, text, extra) => {
    const items = mergeItems(
      scanWithRegex(text),
      extra.map((t) => item(t, t.includes("diabetes") ? "HEALTH" : "PERSON")),
    );
    const { masked, map } = mask(text, items);
    for (const it of items) expect(masked).not.toContain(it.text);
    expect(leakCheck(masked, items).ok).toBe(true);
    expect(unmask(masked, map)).toBe(text);
  });
});

describe("leakCheck", () => {
  it("passes for properly masked text", () => {
    const items = [item("Hana Jaziri", "PERSON")];
    const { masked } = mask("Hana Jaziri says hi.", items);
    expect(leakCheck(masked, items)).toEqual({ ok: true, leaks: [] });
  });

  it("catches a missed email via a new regex hit", () => {
    const items = [item("Hana Jaziri", "PERSON")];
    const { masked } = mask("Hana Jaziri: hana.j@example.com", items);
    const report = leakCheck(masked, items);
    expect(report.ok).toBe(false);
    expect(report.leaks).toEqual([{ text: "hana.j@example.com", type: "EMAIL", reason: "regex" }]);
  });

  it("catches an enabled item still present in the text", () => {
    const items = [item("Hana Jaziri", "PERSON")];
    const report = leakCheck("Hana Jaziri was not masked.", items);
    expect(report.leaks).toEqual([{ text: "Hana Jaziri", type: "PERSON", reason: "item" }]);
  });

  it("ignores items the user disabled, even when the regex finds them", () => {
    const items = [item("hana.j@example.com", "EMAIL", { enabled: false })];
    expect(leakCheck("Write to hana.j@example.com", items).ok).toBe(true);
  });

  it("reports each leaked text once", () => {
    const items = [item("x@example.com", "EMAIL")];
    const report = leakCheck("x@example.com x@example.com", items);
    expect(report.leaks).toHaveLength(1);
  });
});
