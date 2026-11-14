// Browser-only. Gemini Nano status and download (SPEC §5).
// LanguageModel is used here for UI STATUS ONLY. Inference goes through firebase/ai.
import { DEVICE_CREATE_OPTIONS, hybridModel } from "./models";

export type DeviceStatus =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable"
  | "unsupported";

const KNOWN: ReadonlySet<string> = new Set([
  "available",
  "downloadable",
  "downloading",
  "unavailable",
]);

/** Reports whether the on-device model can be used, for display in the UI. */
export async function getDeviceStatus(): Promise<DeviceStatus> {
  const api = globalThis.LanguageModel;
  if (typeof api === "undefined" || typeof api.availability !== "function") {
    return "unsupported";
  }
  try {
    const value: unknown = await api.availability(DEVICE_CREATE_OPTIONS);
    return typeof value === "string" && KNOWN.has(value)
      ? (value as DeviceStatus)
      : "unavailable";
  } catch {
    return "unavailable";
  }
}

/**
 * Downloads and prepares the on-device model via `initializeDeviceModel()`.
 * MUST be called from a click handler (Chrome requires a user gesture).
 * `onProgress` receives a value from 0 to 1. Resolves when the download ends;
 * it also resolves (without error) if the model is unavailable, so re-check
 * getDeviceStatus() afterwards.
 */
export async function prepareDeviceModel(
  onProgress: (progress: number) => void,
): Promise<void> {
  await hybridModel().initializeDeviceModel(onProgress);
}
