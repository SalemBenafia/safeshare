import { afterEach, describe, expect, it, vi } from "vitest";
import { grantCloudConsent, hasCloudConsent, resetCloudConsent } from "../consent";

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

afterEach(() => {
  resetCloudConsent();
  vi.unstubAllGlobals();
});

describe("cloud consent", () => {
  it("is not granted by default", () => {
    vi.stubGlobal("sessionStorage", fakeStorage());
    expect(hasCloudConsent()).toBe(false);
  });

  it("remembers a grant in sessionStorage", () => {
    const storage = fakeStorage();
    vi.stubGlobal("sessionStorage", storage);
    grantCloudConsent();
    expect(hasCloudConsent()).toBe(true);
    expect(storage.getItem("safeshare.cloudConsent")).toBe("granted");
  });

  it("still works when storage throws", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(hasCloudConsent()).toBe(false);
    grantCloudConsent();
    expect(hasCloudConsent()).toBe(true);
  });
});
