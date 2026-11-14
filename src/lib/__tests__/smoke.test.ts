import { describe, expect, it } from "vitest";
import { PII_TYPES } from "@/lib/pii/types";
import { DEFAULT_SETTINGS } from "@/lib/settings";

describe("smoke", () => {
  it("defines the nine PII types from the spec", () => {
    expect(PII_TYPES).toHaveLength(9);
    expect(PII_TYPES).toContain("PERSON");
  });

  it("has the Remote Config defaults from the spec", () => {
    expect(DEFAULT_SETTINGS.device_max_chars).toBe(3000);
    expect(DEFAULT_SETTINGS.scan_chunk_chars).toBe(1500);
  });
});
