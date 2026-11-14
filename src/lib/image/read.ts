// Browser-only. Reads the text of a document photo with Gemini Nano, ON THIS DEVICE.
// The image is never uploaded and is not kept: no state, no storage, no logs.
import type { InlineDataPart } from "firebase/ai";
import { imageReadModel } from "../ai/models";

export const IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_PROMPT = "Transcribe all the text in this image exactly. Output only the text.";

export type ImageType = (typeof IMAGE_TYPES)[number];

/** Returns a user-facing error message, or null if the file can be read. */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Only JPEG and PNG images are supported. Please choose a .jpg or .png file.";
  }
  if (file.size === 0) return "This image file is empty.";
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `This image is ${mb} MB. The maximum is 5 MB: try a smaller photo or a screenshot.`;
  }
  return null;
}

/** Base64 without a data: prefix, in chunks to avoid call-stack limits on large images. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Converts a file to the inline-data part used by Firebase AI Logic (base64 + mimeType). */
export async function fileToInlinePart(file: Blob & { type: string }): Promise<InlineDataPart> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { type: "inlineData", inlineData: { data: bytesToBase64(bytes), mimeType: file.type } };
}

export class ImageReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageReadError";
  }
}

/**
 * Transcribes the text in a JPEG/PNG image using imageReadModel() (ONLY_ON_DEVICE).
 * Validates first, so an invalid file never reaches the model.
 */
export async function readImageText(file: Blob & { type: string; size: number }): Promise<string> {
  const problem = validateImageFile(file);
  if (problem) throw new ImageReadError(problem);

  let part: InlineDataPart | null = await fileToInlinePart(file);
  try {
    const result = await imageReadModel().generateContent([IMAGE_PROMPT, part]);
    const text = result.response.text().trim();
    if (!text) throw new ImageReadError("No text was found in this image. Try a sharper, well-lit photo.");
    return text;
  } finally {
    // Drop our reference to the image data as soon as reading is done.
    part.inlineData.data = "";
    part = null;
  }
}
