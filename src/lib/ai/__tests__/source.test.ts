import { InferenceSource } from "firebase/ai";
import { describe, expect, it } from "vitest";
import { toSource } from "@/lib/ai/source";

describe("toSource", () => {
  it("maps the SDK on-device value", () => {
    expect(toSource(InferenceSource.ON_DEVICE)).toBe("ON_DEVICE");
  });

  it("maps the SDK in-cloud value", () => {
    expect(toSource(InferenceSource.IN_CLOUD)).toBe("IN_CLOUD");
  });

  it("matches the documented raw strings", () => {
    expect(toSource("on_device")).toBe("ON_DEVICE");
    expect(toSource("in_cloud")).toBe("IN_CLOUD");
  });

  it("returns UNKNOWN for missing or unexpected values", () => {
    expect(toSource(undefined)).toBe("UNKNOWN");
    expect(toSource(null)).toBe("UNKNOWN");
    expect(toSource("")).toBe("UNKNOWN");
    expect(toSource("ON_DEVICE")).toBe("UNKNOWN");
    expect(toSource("somewhere_else")).toBe("UNKNOWN");
    expect(toSource(42)).toBe("UNKNOWN");
  });
});
