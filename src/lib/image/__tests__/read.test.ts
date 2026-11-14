import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@/lib/ai/models", () => ({ imageReadModel: () => ({ generateContent }) }));

const { IMAGE_PROMPT, MAX_IMAGE_BYTES, bytesToBase64, fileToInlinePart, readImageText, validateImageFile } =
  await import("../read");

/** A tiny fake "image" (just bytes; the model is mocked). */
function fakeImage(type = "image/png", bytes = [137, 80, 78, 71, 13, 10, 26, 10]) {
  return new Blob([new Uint8Array(bytes)], { type });
}

beforeEach(() => {
  generateContent.mockReset();
});

describe("validateImageFile", () => {
  it.each(["image/jpeg", "image/png"])("accepts %s", (type) => {
    expect(validateImageFile({ type, size: 1000 })).toBeNull();
  });

  it.each(["image/gif", "image/webp", "image/heic", "application/pdf", "text/plain", ""])("rejects %j", (type) => {
    expect(validateImageFile({ type, size: 1000 })).toMatch(/Only JPEG and PNG/);
  });

  it("accepts exactly 5 MB and rejects anything larger", () => {
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES })).toBeNull();
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toMatch(/maximum is 5 MB/);
  });

  it("rejects an empty file", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 0 })).toMatch(/empty/);
  });
});

describe("fileToInlinePart", () => {
  it("builds base64 inline data with the mime type, without a data: prefix", async () => {
    const part = await fileToInlinePart(fakeImage("image/png", [104, 105]));
    expect(part).toEqual({ type: "inlineData", inlineData: { data: "aGk=", mimeType: "image/png" } });
  });

  it("encodes large buffers in chunks", () => {
    const bytes = new Uint8Array(100_000).fill(65);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
  });
});

describe("readImageText", () => {
  it("sends the exact prompt and the inline image to the on-device model", async () => {
    generateContent.mockResolvedValue({ response: { text: () => "  Ahmed Ben Ali\nSfax  " } });
    const text = await readImageText(fakeImage("image/jpeg"));
    expect(text).toBe("Ahmed Ben Ali\nSfax");
    const [request] = generateContent.mock.calls[0];
    expect(request[0]).toBe(IMAGE_PROMPT);
    expect(request[0]).toBe("Transcribe all the text in this image exactly. Output only the text.");
    expect(request[1].inlineData.mimeType).toBe("image/jpeg");
  });

  it("clears the image data after reading", async () => {
    generateContent.mockResolvedValue({ response: { text: () => "ok" } });
    await readImageText(fakeImage());
    const [request] = generateContent.mock.calls[0];
    expect(request[1].inlineData.data).toBe("");
  });

  it("never calls the model for an invalid file", async () => {
    await expect(readImageText(fakeImage("image/gif"))).rejects.toThrow(/Only JPEG and PNG/);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("reports an image with no text", async () => {
    generateContent.mockResolvedValue({ response: { text: () => "   " } });
    await expect(readImageText(fakeImage())).rejects.toThrow(/No text was found/);
  });

  it("clears the image data even when the model fails", async () => {
    generateContent.mockRejectedValue(new Error("on-device model failed"));
    await expect(readImageText(fakeImage())).rejects.toThrow();
    expect(generateContent.mock.calls[0][0][1].inlineData.data).toBe("");
  });
});
