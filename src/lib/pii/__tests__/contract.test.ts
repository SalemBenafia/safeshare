// Regression tests for the four scan-quality problems seen on the long contract sample.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/settings";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@/lib/ai/models", () => ({ scanModel: () => ({ generateContent }) }));

const { scanDocument, scanWithRegex, buildScanPrompt } = await import("../scan");
const { mask } = await import("../mask");

const contract = readFileSync(resolve(process.cwd(), "public/samples/sample-long-contract.txt"), "utf8");

/** What Gemini Nano actually returned in the live run (problems 1-4), plus correct items. */
const NANO_ANSWER = {
  items: [
    { text: "10 January 2026", type: "DATE_OF_BIRTH" }, // 1. contract date
    { text: "1 February 2026", type: "DATE_OF_BIRTH" }, // 1.
    { text: "31 July 2026", type: "DATE_OF_BIRTH" }, // 1.
    { text: "22 September 1988", type: "DATE_OF_BIRTH" }, // a real date of birth
    { text: "Olive Data SARL", type: "PERSON" }, // 2. company as person
    { text: "Client", type: "OTHER" }, // 3. role word
    { text: "Consultant", type: "OTHER" }, // 3.
    { text: "+216 22 333 444)", type: "PHONE" }, // 4. swallowed bracket
    { text: "Leila Mansour", type: "PERSON" },
    { text: "Claire Dubois", type: "PERSON" },
    { text: "Karim Haddad", type: "PERSON" },
  ],
};

beforeEach(() => {
  generateContent.mockReset();
  generateContent.mockResolvedValue({ response: { text: () => JSON.stringify(NANO_ANSWER) } });
});

async function scanContract() {
  const result = await scanDocument(contract, "available", DEFAULT_SETTINGS);
  expect(result.usedAI).toBe(true);
  return result.items;
}

describe("long contract scan quality", () => {
  it("is long enough to exercise chunking and the cloud route", () => {
    expect(contract.length).toBeGreaterThan(4000);
  });

  it("ordinary dates are DATE (enabled); the real birth date is DATE_OF_BIRTH", async () => {
    const items = await scanContract();
    for (const date of ["10 January 2026", "1 February 2026", "31 July 2026"]) {
      expect(items.find((i) => i.text === date)).toMatchObject({ type: "DATE", enabled: true });
    }
    expect(items.find((i) => i.text === "22 September 1988")?.type).toBe("DATE_OF_BIRTH");
    expect(items.filter((i) => i.type === "DATE_OF_BIRTH").map((i) => i.text)).toEqual(["22 September 1988"]);
  });

  it("masks the dates by default", async () => {
    const items = await scanContract();
    const { masked } = mask(contract, items);
    expect(masked).toMatch(/made on \[DATE_\d+\]/);
    expect(masked).toContain("born on [DATE_OF_BIRTH_1]");
    for (const date of ["10 January 2026", "1 February 2026", "31 July 2026", "22 September 1988"]) {
      expect(masked).not.toContain(date);
    }
  });

  it("does not turn durations, plain years or clause numbers into items", async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            items: [
              { text: "thirty days", type: "DATE" },
              { text: "2026", type: "DATE" },
              { text: "1.2", type: "DATE" },
            ],
          }),
      },
    });
    const items = await scanContract();
    const texts = items.map((i) => i.text);
    expect(texts).not.toContain("thirty days");
    expect(texts).not.toContain("2026");
    expect(texts).not.toContain("1.2");
  });

  it("problem 2: the company is OTHER, not PERSON", async () => {
    const items = await scanContract();
    expect(items.find((i) => i.text === "Olive Data SARL")?.type).toBe("OTHER");
    expect(items.find((i) => i.text === "Leila Mansour")?.type).toBe("PERSON");
  });

  it("problem 3: role words are never items, so they stay readable", async () => {
    const items = await scanContract();
    expect(items.map((i) => i.text)).not.toEqual(expect.arrayContaining(["Client"]));
    expect(items.map((i) => i.text)).not.toEqual(expect.arrayContaining(["Consultant"]));
    const { masked } = mask(contract, items);
    expect(masked).toContain("The Client will pay the Consultant");
    expect(masked).not.toMatch(/\[OTHER_\d+\] will pay/);
  });

  it("problem 4: items never include edge punctuation, and the bracket stays in the text", async () => {
    const items = await scanContract();
    for (const i of items) expect(i.text).toBe(i.text.replace(/^[\s()[\],.;:]+|[\s()[\],.;:]+$/g, ""));
    expect(items.map((i) => i.text)).toContain("+216 22 333 444");
    const { masked } = mask(contract, items);
    expect(masked).toMatch(/\[PHONE_\d+\]\)/);
  });

  it("problem 4 (regex): the phone pattern no longer swallows the closing bracket", () => {
    const phones = scanWithRegex(contract).filter((i) => i.type === "PHONE").map((i) => i.text);
    expect(phones).toContain("+216 22 333 444");
    expect(phones.every((p) => !p.endsWith(")"))).toBe(true);
  });

  it("keeps the real personal data masked", async () => {
    const items = await scanContract();
    const { masked } = mask(contract, items);
    for (const value of ["Leila Mansour", "Claire Dubois", "Karim Haddad", "22 September 1988", "FR14 2004 1010 0505 0001 3M02 606", "claire.dubois@example.org"]) {
      expect(masked).not.toContain(value);
    }
    expect(masked).not.toContain("10 January 2026");
  });

  it("the regex-only scan finds the same dates, with no edge punctuation", async () => {
    const { items } = await scanDocument(contract, "unavailable", DEFAULT_SETTINGS);
    const types = Object.fromEntries(items.map((i) => [i.text, i.type]));
    expect(types).toMatchObject({
      "10 January 2026": "DATE",
      "1 February 2026": "DATE",
      "31 July 2026": "DATE",
      "22 September 1988": "DATE_OF_BIRTH",
    });
    expect(items.every((i) => !/[()]$/.test(i.text))).toBe(true);
  });
});

describe("long contract: addresses", () => {
  it("joins address parts returned separately into one ADDRESS item each", async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            items: [
              { text: "8 Rue Ibn Khaldoun", type: "ADDRESS" },
              { text: "3027 Sfax", type: "ADDRESS" },
              { text: "Tunisia", type: "ADDRESS" },
              { text: "27 Rue des Lilas", type: "ADDRESS" },
              { text: "69003 Lyon", type: "ADDRESS" },
              { text: "France", type: "ADDRESS" },
            ],
          }),
      },
    });
    const items = await scanContract();
    const addresses = items.filter((i) => i.type === "ADDRESS").map((i) => i.text);
    expect(addresses).toContain("8 Rue Ibn Khaldoun, 3027 Sfax, Tunisia");
    expect(addresses).toContain("27 Rue des Lilas, 69003 Lyon, France");
    // Parts that only appear inside a full address are not listed separately.
    for (const part of ["8 Rue Ibn Khaldoun", "3027 Sfax", "27 Rue des Lilas", "69003 Lyon", "France"]) {
      expect(addresses).not.toContain(part);
    }
    const { masked } = mask(contract, items);
    expect(masked).toMatch(/registered office at \[ADDRESS_\d+\], represented/);
    expect(masked).toMatch(/residing at \[ADDRESS_\d+\], email/);
  });
});

describe("scan prompt", () => {
  it("states the rules for companies, role words and dates, with examples", () => {
    const prompt = buildScanPrompt("Some text.");
    expect(prompt).toMatch(/organisation names have type OTHER, never PERSON/);
    expect(prompt).toMatch(/Never list role words/);
    expect(prompt).toMatch(/Dates are personal data/);
    expect(prompt).toMatch(/Use DATE_OF_BIRTH only when/);
    expect(prompt).toMatch(/Every other full date .* is DATE/);
    expect(prompt).toMatch(/Plain years .* durations .* clause numbers .* are not dates/);
    expect(prompt.match(/^Text: /gm)).toHaveLength(3);
    expect(prompt.match(/^Answer: /gm)).toHaveLength(3);
    expect(prompt.trimEnd().endsWith("Some text.\nTEXT END")).toBe(true);
  });
});
