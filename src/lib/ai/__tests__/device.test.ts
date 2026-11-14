import { afterEach, describe, expect, it, vi } from "vitest";
import { getDeviceStatus } from "@/lib/ai/device";
import { DEVICE_CREATE_OPTIONS } from "@/lib/ai/models";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getDeviceStatus", () => {
  it("returns unsupported when the Prompt API does not exist", async () => {
    vi.stubGlobal("LanguageModel", undefined);
    await expect(getDeviceStatus()).resolves.toBe("unsupported");
  });

  it.each(["available", "downloadable", "downloading", "unavailable"] as const)(
    "passes through %s",
    async (value) => {
      vi.stubGlobal("LanguageModel", { availability: vi.fn().mockResolvedValue(value) });
      await expect(getDeviceStatus()).resolves.toBe(value);
    },
  );

  it("checks with the same options our models use", async () => {
    const availability = vi.fn().mockResolvedValue("available");
    vi.stubGlobal("LanguageModel", { availability });
    await getDeviceStatus();
    expect(availability).toHaveBeenCalledWith(DEVICE_CREATE_OPTIONS);
  });

  it("treats unknown values as unavailable", async () => {
    vi.stubGlobal("LanguageModel", { availability: vi.fn().mockResolvedValue("readily") });
    await expect(getDeviceStatus()).resolves.toBe("unavailable");
  });

  it("treats errors as unavailable", async () => {
    vi.stubGlobal("LanguageModel", { availability: vi.fn().mockRejectedValue(new Error("boom")) });
    await expect(getDeviceStatus()).resolves.toBe("unavailable");
  });
});
