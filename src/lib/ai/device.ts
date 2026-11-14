// Browser-only. Gemini Nano status and download (SPEC §5).
import { notImplemented } from "../notImplemented";

export type DeviceStatus =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable"
  | "unsupported";

/** Reports whether the on-device model can be used. */
export async function getDeviceStatus(): Promise<DeviceStatus> {
  return notImplemented("getDeviceStatus");
}

/**
 * Downloads and prepares the on-device model via `initializeDeviceModel()`.
 * Must be called from a user click. `onProgress` receives a value from 0 to 1.
 */
export async function prepareDeviceModel(
  onProgress: (progress: number) => void,
): Promise<void> {
  void onProgress;
  return notImplemented("prepareDeviceModel");
}
