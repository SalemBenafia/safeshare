import { describe, expect, it } from "vitest";
import { mergeItems } from "../scan";
import { itemId } from "../types";
import { item } from "./helpers";

describe("mergeItems", () => {
  it("dedupes by exact text and keeps first-appearance order", () => {
    const merged = mergeItems(
      [item("Sara Ben Salah", "PERSON"), item("s@example.com", "EMAIL")],
      [item("s@example.com", "EMAIL"), item("Tom Hardy-Smith", "PERSON")],
    );
    expect(merged.map((i) => i.text)).toEqual(["Sara Ben Salah", "s@example.com", "Tom Hardy-Smith"]);
  });

  it("treats different case as different text", () => {
    expect(mergeItems([item("Sfax", "ADDRESS"), item("SFAX", "ADDRESS")])).toHaveLength(2);
  });

  it("prefers the more specific type", () => {
    const merged = mergeItems(
      [item("+216 98 765 432", "OTHER", { origin: "ai" })],
      [item("+216 98 765 432", "PHONE", { origin: "regex" })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].type).toBe("PHONE");
  });

  it("does not downgrade a specific type", () => {
    const merged = mergeItems([item("a@example.com", "EMAIL")], [item("a@example.com", "OTHER")]);
    expect(merged[0].type).toBe("EMAIL");
  });

  it("keeps the first item's id, enabled flag and origin", () => {
    const first = { ...item("Nadia Kefi", "OTHER", { origin: "user", enabled: false }), id: "custom-1" };
    const merged = mergeItems([first], [item("Nadia Kefi", "PERSON", { origin: "ai" })]);
    expect(merged[0]).toEqual({ ...first, type: "PERSON" });
  });

  it("produces stable ids from the text", () => {
    expect(itemId("Nadia Kefi")).toBe(itemId("Nadia Kefi"));
    expect(itemId("Nadia Kefi")).not.toBe(itemId("Nadia  Kefi"));
    expect(itemId("Nadia Kefi")).toMatch(/^pii-[0-9a-f]{8}$/);
  });
});
