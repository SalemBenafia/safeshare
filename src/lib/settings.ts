// Remote Config parameters with in-app defaults (SPEC §9).
import { notImplemented } from "./notImplemented";

export interface Settings {
  cloud_model: string;
  device_max_chars: number;
  scan_chunk_chars: number;
  /** Feature flag: shows the "Save history" option. The user toggle itself is OFF by default. */
  history_enabled: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  cloud_model: "gemini-3.5-flash-lite",
  device_max_chars: 3000,
  scan_chunk_chars: 1500,
  history_enabled: true,
});

/** Fetches and activates Remote Config, falling back to the defaults. */
export async function loadSettings(): Promise<Settings> {
  return notImplemented("loadSettings");
}

/** Returns the current settings (defaults until loadSettings() resolves). */
export function getSettings(): Settings {
  return notImplemented("getSettings");
}
