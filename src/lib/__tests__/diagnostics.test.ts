import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLastAnswer, recordLastAnswer, resetLastAnswerForTests, subscribeLastAnswer } from "../diagnostics";

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

beforeEach(() => {
  resetLastAnswerForTests();
  vi.stubGlobal("sessionStorage", fakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("last answer diagnostics", () => {
  it("is empty at first", () => {
    expect(getLastAnswer()).toBeNull();
  });

  it("records the source and reason, and notifies listeners", () => {
    const listener = vi.fn();
    subscribeLastAnswer(listener);
    recordLastAnswer("IN_CLOUD", "Long document (4,000 characters) → cloud", new Date("2026-11-14T10:00:00Z"));
    expect(getLastAnswer()).toEqual({
      source: "IN_CLOUD",
      reason: "Long document (4,000 characters) → cloud",
      at: "2026-11-14T10:00:00.000Z",
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("survives a reload within the session", () => {
    recordLastAnswer("ON_DEVICE", "Short task → on-device");
    resetLastAnswerForTests();
    expect(getLastAnswer()?.source).toBe("ON_DEVICE");
  });

  it("returns a stable snapshot", () => {
    recordLastAnswer("ON_DEVICE", "Short task → on-device");
    expect(getLastAnswer()).toBe(getLastAnswer());
  });
});
