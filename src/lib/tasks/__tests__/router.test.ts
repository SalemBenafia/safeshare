import { describe, expect, it } from "vitest";
import type { DeviceStatus } from "@/lib/ai/device";
import { pickRoute } from "../router";

const settings = { device_max_chars: 3000 };
const short = "x".repeat(200);
const long = "x".repeat(3001);

describe("pickRoute (SPEC §6)", () => {
  describe("rule 2: translation into French or Arabic -> cloud", () => {
    it.each(["fr", "ar"] as const)("sends %s translations to the cloud", (language) => {
      const route = pickRoute({ kind: "translate", options: { language } }, short, settings, "available");
      expect(route.target).toBe("cloud");
      expect(route.reason).toBe(`Translation into ${language === "fr" ? "French" : "Arabic"} → cloud`);
    });

    it("does not apply to English", () => {
      const route = pickRoute({ kind: "translate", options: { language: "en" } }, short, settings, "available");
      expect(route).toEqual({ target: "hybrid", reason: "Short task → on-device" });
    });

    it("wins over the other rules", () => {
      const route = pickRoute({ kind: "translate", options: { language: "ar" } }, long, settings, "unavailable");
      expect(route.reason).toMatch(/Arabic/);
    });
  });

  describe("rule 3: long masked text -> cloud", () => {
    it("sends text longer than device_max_chars to the cloud", () => {
      const route = pickRoute({ kind: "summarise", options: {} }, long, settings, "available");
      expect(route).toEqual({ target: "cloud", reason: "Long document (3,001 characters) → cloud" });
    });

    it("keeps text of exactly device_max_chars on-device", () => {
      const route = pickRoute({ kind: "summarise", options: {} }, "x".repeat(3000), settings, "available");
      expect(route.target).toBe("hybrid");
    });

    it("wins over rule 4", () => {
      const route = pickRoute({ kind: "summarise", options: {} }, long, settings, "unsupported");
      expect(route.reason).toMatch(/Long document/);
    });

    it("uses the setting value", () => {
      const route = pickRoute({ kind: "summarise", options: {} }, short, { device_max_chars: 100 }, "available");
      expect(route.target).toBe("cloud");
    });
  });

  describe("rule 4: device model not available -> cloud", () => {
    it.each(["downloadable", "downloading", "unavailable", "unsupported"] as DeviceStatus[])(
      "sends tasks to the cloud when the device is %s",
      (status) => {
        const route = pickRoute({ kind: "rewrite", options: { style: "simple" } }, short, settings, status);
        expect(route).toEqual({ target: "cloud", reason: "On-device AI not available → cloud" });
      },
    );
  });

  describe("rule 5: otherwise hybrid", () => {
    it.each(["summarise", "rewrite", "ask"] as const)("runs a short %s task on-device", (kind) => {
      const route = pickRoute({ kind, options: { style: "formal", question: "Why?" } }, short, settings, "available");
      expect(route).toEqual({ target: "hybrid", reason: "Short task → on-device" });
    });
  });
});
