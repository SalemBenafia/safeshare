import { describe, expect, it } from "vitest";
import { cvText } from "../__fixtures__/cv";
import { letterText } from "../__fixtures__/medical-letter";
import { chunkText } from "../scan";

const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);

/** A cut is mid-word if the characters on both sides of it are word characters. */
function cutsMidWord(chunks: string[]): boolean {
  for (let i = 0; i < chunks.length - 1; i++) {
    const left = chunks[i];
    const right = chunks[i + 1];
    if (isWordChar(left[left.length - 1]) && isWordChar(right[0])) return true;
  }
  return false;
}

describe("chunkText", () => {
  it("returns no chunks for empty text", () => {
    expect(chunkText("", 100)).toEqual([]);
  });

  it("returns one chunk when the text fits", () => {
    expect(chunkText("Short text.", 100)).toEqual(["Short text."]);
  });

  it.each([40, 80, 150, 400])("rejoins to the original text (max %i)", (max) => {
    for (const text of [cvText, letterText]) {
      expect(chunkText(text, max).join("")).toBe(text);
    }
  });

  it.each([40, 80, 150, 400])("never cuts in the middle of a word (max %i)", (max) => {
    for (const text of [cvText, letterText]) {
      expect(cutsMidWord(chunkText(text, max))).toBe(false);
    }
  });

  it.each([40, 80, 150, 400])("keeps chunks within maxChars (max %i)", (max) => {
    for (const text of [cvText, letterText]) {
      for (const chunk of chunkText(text, max)) {
        const singleWord = !/\s/.test(chunk.trim());
        expect(chunk.length <= max || singleWord).toBe(true);
      }
    }
  });

  it("prefers paragraph boundaries", () => {
    const a = "First paragraph has some words.";
    const b = "Second paragraph has more words.";
    const chunks = chunkText(`${a}\n\n${b}`, 40);
    expect(chunks).toEqual([`${a}\n\n`, b]);
  });

  it("falls back to sentence boundaries inside a long paragraph", () => {
    const text = "One short sentence here. Another short sentence there.";
    const chunks = chunkText(text, 30);
    expect(chunks).toEqual(["One short sentence here. ", "Another short sentence there."]);
  });

  it("keeps an over-long word whole", () => {
    const long = "x".repeat(30);
    const chunks = chunkText(`tiny ${long} end`, 10);
    expect(chunks).toContain(`${long} `);
    expect(chunks.join("")).toBe(`tiny ${long} end`);
  });

  it("rejects a non-positive maxChars", () => {
    expect(() => chunkText("abc", 0)).toThrow();
  });
});
