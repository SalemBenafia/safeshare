import { describe, expect, it } from "vitest";
import { cvText } from "../__fixtures__/cv";
import { mask } from "../mask";
import { scanWithRegex } from "../scan";
import { buildSegments } from "../segments";
import { item } from "./helpers";

describe("buildSegments", () => {
  it("returns one plain segment with no items", () => {
    expect(buildSegments("Hello.", [])).toEqual([{ text: "Hello." }]);
  });

  it("rejoins to the original text", () => {
    const items = scanWithRegex(cvText);
    expect(buildSegments(cvText, items).map((s) => s.text).join("")).toBe(cvText);
  });

  it("highlights the longer overlapping item", () => {
    const short = item("Ahmed", "PERSON");
    const long = item("Ahmed Ben Ali", "PERSON");
    const segs = buildSegments("Ahmed Ben Ali and Ahmed", [short, long]);
    expect(segs.map((s) => [s.text, s.item?.text])).toEqual([
      ["Ahmed Ben Ali", "Ahmed Ben Ali"],
      [" and ", undefined],
      ["Ahmed", "Ahmed"],
    ]);
  });

  it("shows disabled items too", () => {
    const segs = buildSegments("Tunis is nice", [item("Tunis", "ADDRESS", { enabled: false })]);
    expect(segs[0]).toMatchObject({ text: "Tunis", item: { enabled: false } });
  });

  it("matches what mask() will replace when a disabled item overlaps an enabled one", () => {
    const items = [item("Ahmed Ben Ali", "PERSON", { enabled: false }), item("Ahmed", "PERSON")];
    const text = "Ahmed Ben Ali";
    const segs = buildSegments(text, items);
    expect(segs.map((s) => [s.text, s.item?.enabled])).toEqual([
      ["Ahmed", true],
      [" Ben Ali", undefined],
    ]);
    expect(mask(text, items).masked).toBe("[PERSON_1] Ben Ali");
  });
});
