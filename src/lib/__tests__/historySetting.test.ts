import { afterEach, describe, expect, it, vi } from "vitest";
import { isSaveHistoryOn, setSaveHistory } from "../historySetting";

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("save history setting", () => {
  it("is OFF by default", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    expect(isSaveHistoryOn()).toBe(false);
  });

  it("turns on and off", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    setSaveHistory(true);
    expect(isSaveHistoryOn()).toBe(true);
    setSaveHistory(false);
    expect(isSaveHistoryOn()).toBe(false);
  });

  it("notifies listeners in this tab", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    const dispatch = vi.fn();
    vi.stubGlobal("dispatchEvent", dispatch);
    setSaveHistory(true);
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("stays off when storage throws", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    vi.stubGlobal("localStorage", { getItem: boom, setItem: boom, removeItem: boom });
    expect(() => setSaveHistory(true)).not.toThrow();
    expect(isSaveHistoryOn()).toBe(false);
  });
});
