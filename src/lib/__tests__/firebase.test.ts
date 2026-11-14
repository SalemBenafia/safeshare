import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase/app", () => ({ initializeApp: vi.fn(() => ({ name: "app" })) }));
vi.mock("firebase/app-check", () => ({
  initializeAppCheck: vi.fn(),
  ReCaptchaEnterpriseProvider: class {},
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn() }));
vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }));

const CONFIG = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "test-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "test.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:1:web:1",
  NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY: "site-key",
};

async function initWith(env: string, hostname: string) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env);
  for (const [k, v] of Object.entries(CONFIG)) vi.stubEnv(k, v);
  const fakeSelf: Record<string, unknown> = {};
  vi.stubGlobal("window", {});
  vi.stubGlobal("self", fakeSelf);
  vi.stubGlobal("location", { hostname });
  const { getFirebaseApp } = await import("../firebase");
  getFirebaseApp();
  const { initializeAppCheck } = await import("firebase/app-check");
  return { fakeSelf, initializeAppCheck };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("App Check debug token", () => {
  it("is never set in a production build", async () => {
    const { fakeSelf, initializeAppCheck } = await initWith("production", "localhost");
    expect(fakeSelf.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
    expect(initializeAppCheck).toHaveBeenCalledOnce();
  });

  it("is not set in development when the page is not on localhost", async () => {
    const { fakeSelf } = await initWith("development", "safeshare-ee7d7.web.app");
    expect(fakeSelf.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
  });

  it("is set in development on localhost, before App Check starts", async () => {
    const { fakeSelf, initializeAppCheck } = await initWith("development", "localhost");
    expect(fakeSelf.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe(true);
    expect(initializeAppCheck).toHaveBeenCalledOnce();
  });
});
