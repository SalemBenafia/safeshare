// Remote Config parameters with in-app defaults (SPEC §9).
// loadSettings() runs once on app start, in the browser, without blocking the UI;
// until it finishes (or if it fails) the in-app defaults are used.
import {
  fetchAndActivate,
  getRemoteConfig,
  getValue,
  isSupported,
  type RemoteConfig,
} from "firebase/remote-config";
import { getFirebaseApp } from "./firebase";

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

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

/** 1 hour in production, 1 minute in development. */
export function minimumFetchInterval(env: string | undefined = process.env.NODE_ENV): number {
  return env === "production" ? 60 * 60 * 1000 : 60 * 1000;
}

/** Where each active value came from. */
export type SettingSource = "remote" | "default";

export interface SettingsState {
  values: Readonly<Settings>;
  sources: Readonly<Record<keyof Settings, SettingSource>>;
  status: "defaults" | "loading" | "loaded" | "failed";
}

interface RawValue {
  asString(): string;
  asNumber(): number;
  asBoolean(): boolean;
  getSource(): "static" | "default" | "remote";
}

const MODEL_NAME = /^[a-z0-9][a-z0-9.-]{2,63}$/;
const BOOLEAN_WORDS = ["true", "false", "1", "0", "yes", "no", "on", "off"];

/** Validated value of one key, or undefined if the raw value is unusable. */
function validated<K extends keyof Settings>(key: K, raw: RawValue): Settings[K] | undefined {
  switch (key) {
    case "cloud_model": {
      const model = raw.asString().trim();
      return (MODEL_NAME.test(model) ? model : undefined) as Settings[K] | undefined;
    }
    case "device_max_chars":
    case "scan_chunk_chars": {
      const n = raw.asNumber();
      const [min, max] = key === "device_max_chars" ? [200, 100_000] : [200, 20_000];
      return (Number.isInteger(n) && n >= min && n <= max ? n : undefined) as Settings[K] | undefined;
    }
    case "history_enabled":
      return (BOOLEAN_WORDS.includes(raw.asString().trim().toLowerCase()) ? raw.asBoolean() : undefined) as
        | Settings[K]
        | undefined;
  }
  return undefined;
}

/**
 * Turns raw Remote Config values into typed, validated settings.
 * Any missing or invalid value falls back to its in-app default.
 */
export function parseSettings(get: (key: keyof Settings) => RawValue): SettingsState {
  const values = { ...DEFAULT_SETTINGS } as Settings;
  const sources = {} as Record<keyof Settings, SettingSource>;
  for (const key of SETTING_KEYS) {
    const raw = get(key);
    const value = validated(key, raw);
    const useRemote = value !== undefined && raw.getSource() === "remote";
    (values as unknown as Record<string, unknown>)[key] = value ?? DEFAULT_SETTINGS[key];
    sources[key] = useRemote ? "remote" : "default";
  }
  return { values: Object.freeze(values), sources: Object.freeze(sources), status: "loaded" };
}

// ---------- store (read with useSyncExternalStore) ----------

const DEFAULT_STATE: SettingsState = Object.freeze({
  values: DEFAULT_SETTINGS,
  sources: Object.freeze(Object.fromEntries(SETTING_KEYS.map((k) => [k, "default"]))) as Record<
    keyof Settings,
    SettingSource
  >,
  status: "defaults",
});

let state: SettingsState = DEFAULT_STATE;
let loading: Promise<Settings> | null = null;
const listeners = new Set<() => void>();

function setState(next: SettingsState) {
  state = next;
  for (const l of listeners) l();
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Stable snapshot for useSyncExternalStore. */
export function getSettingsState(): SettingsState {
  return state;
}

export function getServerSettingsState(): SettingsState {
  return DEFAULT_STATE;
}

/** Current typed settings (defaults until loadSettings() succeeds). */
export function getSettings(): Readonly<Settings> {
  return state.values;
}

/**
 * Fetches and activates Remote Config once. Browser only. Never throws:
 * on any error the in-app defaults stay active.
 */
export function loadSettings(): Promise<Settings> {
  if (typeof window === "undefined") return Promise.resolve(state.values);
  loading ??= (async () => {
    setState({ ...state, status: "loading" });
    try {
      if (!(await isSupported())) throw new Error("Remote Config is not supported here.");
      const rc: RemoteConfig = getRemoteConfig(getFirebaseApp());
      rc.settings.minimumFetchIntervalMillis = minimumFetchInterval();
      rc.defaultConfig = { ...DEFAULT_SETTINGS };
      await fetchAndActivate(rc);
      setState(parseSettings((key) => getValue(rc, key)));
    } catch {
      setState({ ...DEFAULT_STATE, status: "failed" });
    }
    return state.values;
  })();
  return loading;
}

/** For tests only. */
export function resetSettingsForTests(): void {
  state = DEFAULT_STATE;
  loading = null;
  listeners.clear();
}
