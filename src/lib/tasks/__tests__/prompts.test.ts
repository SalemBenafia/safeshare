import { describe, expect, it } from "vitest";
import { buildPrompt, PLACEHOLDER_RULE } from "../prompts";
import type { TaskKind, TaskOptions } from "../types";

const MASKED = "[PERSON_1] works at Olive Data. Contact: [EMAIL_1].";

const CASES: [string, TaskKind, TaskOptions][] = [
  ["summarise", "summarise", {}],
  ["rewrite formal", "rewrite", { style: "formal" }],
  ["rewrite simple", "rewrite", { style: "simple" }],
  ["translate en", "translate", { language: "en" }],
  ["translate fr", "translate", { language: "fr" }],
  ["translate ar", "translate", { language: "ar" }],
  ["ask", "ask", { question: "Where does [PERSON_1] work?" }],
];

describe("buildPrompt", () => {
  it.each(CASES)("%s: includes the placeholder rule and the masked text", (_n, task, options) => {
    const prompt = buildPrompt(task, MASKED, options);
    expect(prompt).toContain("Keep placeholders like [PERSON_1] exactly as they are.");
    expect(prompt).toContain(PLACEHOLDER_RULE);
    expect(prompt).toMatch(/Do not create new placeholders/);
    expect(prompt).toContain(MASKED);
  });

  it("uses the requested rewrite style", () => {
    expect(buildPrompt("rewrite", MASKED, { style: "formal" })).toMatch(/formal/i);
    expect(buildPrompt("rewrite", MASKED, { style: "simple" })).toMatch(/simple/i);
  });

  it.each([
    ["en", "English"],
    ["fr", "French"],
    ["ar", "Arabic"],
  ] as const)("names the target language %s", (language, name) => {
    const prompt = buildPrompt("translate", MASKED, { language });
    expect(prompt).toContain(`into ${name}`);
    expect(prompt).toMatch(/do not translate.*placeholders/i);
  });

  it("puts the question after the document", () => {
    const prompt = buildPrompt("ask", MASKED, { question: "  Where does [PERSON_1] work?  " });
    expect(prompt.indexOf("DOCUMENT END")).toBeLessThan(prompt.indexOf("QUESTION: Where does [PERSON_1] work?"));
  });

  it("rejects an empty question and a missing language", () => {
    expect(() => buildPrompt("ask", MASKED, { question: "   " })).toThrow(/question/i);
    expect(() => buildPrompt("translate", MASKED, {})).toThrow(/language/i);
  });

  it("is deterministic (the consent preview equals what is sent)", () => {
    expect(buildPrompt("summarise", MASKED, {})).toBe(buildPrompt("summarise", MASKED, {}));
  });
});
