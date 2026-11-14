import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { cvText } from "../__fixtures__/cv";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));

vi.mock("@/lib/ai/models", () => ({
  scanModel: () => ({ generateContent }),
}));

// Import after the mock is registered.
const { parseScanResponse, scanDocument, scanWithAI } = await import("../scan");

/** Mocks one model answer. */
function reply(body: unknown) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return { response: { text: () => text } };
}

beforeEach(() => {
  generateContent.mockReset();
});

describe("parseScanResponse", () => {
  it("parses the schema shape", () => {
    expect(parseScanResponse('{"items":[{"text":"Ali Zouari","type":"PERSON"}]}')).toEqual([
      { text: "Ali Zouari", type: "PERSON" },
    ]);
  });

  it("accepts a JSON code fence", () => {
    expect(parseScanResponse('```json\n{"items":[]}\n```')).toEqual([]);
  });

  it("maps an unknown type to OTHER and skips malformed entries", () => {
    expect(
      parseScanResponse('{"items":[{"text":"X1","type":"SECRET"},{"text":5},{"type":"EMAIL"}]}'),
    ).toEqual([{ text: "X1", type: "OTHER" }]);
  });

  it.each(["not json", '{"things":[]}', "null", '{"items":"nope"}'])(
    "returns null for invalid output %j",
    (raw) => {
      expect(parseScanResponse(raw)).toBeNull();
    },
  );
});

describe("scanWithAI", () => {
  it("drops hallucinated items that are not in the source text", async () => {
    generateContent.mockResolvedValueOnce(
      reply({
        items: [
          { text: "Ahmed Ben Ali", type: "PERSON" },
          { text: "Mohamed Ben Ali", type: "PERSON" }, // invented by the model
          { text: "ahmed.benali@example.com ", type: "EMAIL" }, // trailing space is fine
          { text: "Rue des Palmiers", type: "ADDRESS" }, // not in the text
          { text: "A", type: "OTHER" }, // too short
        ],
      }),
    );
    const { items, failedChunks } = await scanWithAI(cvText, 5000);
    expect(failedChunks).toBe(0);
    expect(items.map((i) => i.text)).toEqual(["Ahmed Ben Ali", "ahmed.benali@example.com"]);
    expect(items.every((i) => i.origin === "ai" && i.enabled)).toBe(true);
  });

  it("checks items against their own chunk", async () => {
    const text = "Alpha Person lives here.\n\nBeta Person lives there.";
    generateContent
      .mockResolvedValueOnce(reply({ items: [{ text: "Beta Person", type: "PERSON" }] }))
      .mockResolvedValueOnce(reply({ items: [{ text: "Beta Person", type: "PERSON" }] }));
    const { items } = await scanWithAI(text, 30);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(items.map((i) => i.text)).toEqual(["Beta Person"]);
  });

  it("retries once when the JSON is invalid", async () => {
    generateContent
      .mockResolvedValueOnce(reply("sorry, here you go: {items"))
      .mockResolvedValueOnce(reply({ items: [{ text: "Claire Dubois", type: "PERSON" }] }));
    const { items, failedChunks } = await scanWithAI(cvText, 5000);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(failedChunks).toBe(0);
    expect(items.map((i) => i.text)).toEqual(["Claire Dubois"]);
  });

  it("counts a chunk as failed after two invalid answers", async () => {
    generateContent.mockResolvedValue(reply("still not json"));
    const { items, failedChunks } = await scanWithAI(cvText, 5000);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(failedChunks).toBe(1);
    expect(items).toEqual([]);
  });

  it("calls the model once per chunk and merges results", async () => {
    generateContent.mockImplementation(async (prompt: string) =>
      reply({
        items: prompt.includes("Claire Dubois")
          ? [{ text: "Claire Dubois", type: "PERSON" }]
          : [{ text: "Ahmed Ben Ali", type: "PERSON" }],
      }),
    );
    const { items } = await scanWithAI(cvText, 200);
    expect(generateContent.mock.calls.length).toBeGreaterThan(1);
    expect(new Set(items.map((i) => i.text))).toEqual(new Set(["Ahmed Ben Ali", "Claire Dubois"]));
  });

  it("asks the model to copy items exactly", async () => {
    generateContent.mockResolvedValue(reply({ items: [] }));
    await scanWithAI("Some text.", 100);
    const prompt = generateContent.mock.calls[0][0] as string;
    expect(prompt).toMatch(/every piece of personal data/i);
    expect(prompt).toMatch(/exactly as written/i);
    expect(prompt).toContain("Some text.");
  });
});

describe("scanDocument", () => {
  it("uses regex only when the device model is not available", async () => {
    const result = await scanDocument(cvText, "unavailable", DEFAULT_SETTINGS);
    expect(generateContent).not.toHaveBeenCalled();
    expect(result.usedAI).toBe(false);
    expect(result.items.every((i) => i.origin === "regex")).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("combines AI and regex when the device model is available", async () => {
    generateContent.mockResolvedValue(
      reply({
        items: [
          { text: "Ahmed Ben Ali", type: "PERSON" },
          { text: "+216 98 765 432", type: "OTHER" },
        ],
      }),
    );
    const result = await scanDocument(cvText, "available", DEFAULT_SETTINGS);
    expect(result.usedAI).toBe(true);
    const texts = result.items.map((i) => i.text);
    expect(texts).toContain("Ahmed Ben Ali");
    expect(texts).toContain("ahmed.benali@example.com");
    expect(result.items.find((i) => i.text === "+216 98 765 432")?.type).toBe("PHONE");
    expect(texts.indexOf("Ahmed Ben Ali")).toBe(0); // sorted by position in the document
  });

  it("falls back to regex only if the AI fails", async () => {
    generateContent.mockRejectedValue(new Error("model unavailable"));
    const result = await scanDocument(cvText, "available", DEFAULT_SETTINGS);
    expect(result.usedAI).toBe(false);
    expect(result.items.length).toBeGreaterThan(0);
  });
});
