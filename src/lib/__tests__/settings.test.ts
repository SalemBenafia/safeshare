import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rc = vi.hoisted(() => ({
  instance: { settings: { minimumFetchIntervalMillis: 0 }, defaultConfig: {} as Record<string, unknown> },
  values: {} as Record<string, string>,
  fetchAndActivate: vi.fn(),
  isSupported: vi.fn(),
}));

vi.mock("firebase/remote-config", () => ({
  getRemoteConfig: vi.fn(() => rc.instance),
  fetchAndActivate: rc.fetchAndActivate,
  isSupported: rc.isSupported,
  getValue: (_rc: unknown, key: string) => fakeValue(rc.values[key], key in rc.values ? "remote" : "default"),
}));
vi.mock("@/lib/firebase", () => ({ getFirebaseApp: vi.fn(() => ({})) }));

const settings = await import("../settings");
const { DEFAULT_SETTINGS, getSettings, getSettingsState, loadSettings, minimumFetchInterval, parseSettings, resetSettingsForTests, subscribeSettings } =
  settings;

function fakeValue(raw: string | undefined, source: "remote" | "default" | "static") {
  const s = raw ?? "";
  return {
    asString: () => s,
    asNumber: () => (s.trim() === "" ? 0 : Number(s)),
    asBoolean: () => ["1", "true", "t", "yes", "y", "on"].includes(s.toLowerCase()),
    getSource: () => source,
  };
}

const remote = (values: Record<string, string>) => (key: string) => fakeValue(values[key], key in values ? "remote" : "default");

beforeEach(() => {
  resetSettingsForTests();
  rc.values = {};
  rc.fetchAndActivate.mockReset().mockResolvedValue(true);
  rc.isSupported.mockReset().mockResolvedValue(true);
  vi.stubGlobal("window", {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("parseSettings", () => {
  it("reads typed values from Remote Config", () => {
    const s = parseSettings(
      remote({ cloud_model: "gemini-9-pro", device_max_chars: "5000", scan_chunk_chars: "1200", history_enabled: "false" }),
    );
    expect(s.values).toEqual({ cloud_model: "gemini-9-pro", device_max_chars: 5000, scan_chunk_chars: 1200, history_enabled: false });
    expect(Object.values(s.sources)).toEqual(["remote", "remote", "remote", "remote"]);
  });

  it("falls back to the default for missing or invalid values", () => {
    const s = parseSettings(
      remote({ cloud_model: "bad model name!", device_max_chars: "-3", scan_chunk_chars: "12.5", history_enabled: "maybe" }),
    );
    expect(s.values).toEqual(DEFAULT_SETTINGS);
    expect(Object.values(s.sources)).toEqual(["default", "default", "default", "default"]);
  });

  it("rejects numbers outside safe bounds", () => {
    expect(parseSettings(remote({ device_max_chars: "50" })).values.device_max_chars).toBe(3000);
    expect(parseSettings(remote({ scan_chunk_chars: "999999" })).values.scan_chunk_chars).toBe(1500);
  });

  it("marks a remote value equal to the default as remote", () => {
    expect(parseSettings(remote({ device_max_chars: "3000" })).sources.device_max_chars).toBe("remote");
  });
});

describe("minimumFetchInterval", () => {
  it("is 1 hour in production and 1 minute otherwise", () => {
    expect(minimumFetchInterval("production")).toBe(3_600_000);
    expect(minimumFetchInterval("development")).toBe(60_000);
  });
});

describe("loadSettings", () => {
  it("starts with the in-app defaults", () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(getSettingsState().status).toBe("defaults");
  });

  it("fetches, activates and exposes the remote values", async () => {
    rc.values = { cloud_model: "gemini-9-flash", device_max_chars: "4000" };
    const listener = vi.fn();
    subscribeSettings(listener);
    await loadSettings();
    expect(rc.fetchAndActivate).toHaveBeenCalledOnce();
    expect(rc.instance.defaultConfig).toEqual({ ...DEFAULT_SETTINGS });
    expect(getSettings()).toMatchObject({ cloud_model: "gemini-9-flash", device_max_chars: 4000, scan_chunk_chars: 1500 });
    expect(getSettingsState().status).toBe("loaded");
    expect(listener).toHaveBeenCalled();
  });

  it("sets the minimum fetch interval for the environment", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await loadSettings();
    expect(rc.instance.settings.minimumFetchIntervalMillis).toBe(60_000);
  });

  it("only fetches once", async () => {
    await Promise.all([loadSettings(), loadSettings()]);
    await loadSettings();
    expect(rc.fetchAndActivate).toHaveBeenCalledOnce();
  });

  it.each([
    ["the fetch fails", () => rc.fetchAndActivate.mockRejectedValue(new Error("offline"))],
    ["Remote Config is not supported", () => rc.isSupported.mockResolvedValue(false)],
  ])("keeps the defaults when %s", async (_name, setup) => {
    setup();
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    expect(getSettingsState().status).toBe("failed");
  });

  it("does nothing on the server", async () => {
    vi.stubGlobal("window", undefined);
    await loadSettings();
    expect(rc.fetchAndActivate).not.toHaveBeenCalled();
  });
});
