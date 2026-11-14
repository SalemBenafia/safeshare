import { describe, expect, it } from "vitest";
import { itemId, type PiiItem } from "@/lib/pii/types";
import {
  initialState,
  validateNewItem,
  workspaceReducer as reduce,
  type WorkspaceState,
} from "../state";

const TEXT = "Contact Rim Sassi at rim@example.com. Rim Sassi agrees.";

function it_(text: string, type: PiiItem["type"], origin: PiiItem["origin"] = "regex"): PiiItem {
  return { id: itemId(text), text, type, enabled: true, origin };
}

function scanned(items: PiiItem[] = [it_("rim@example.com", "EMAIL")]): WorkspaceState {
  let s = reduce(initialState, { type: "SET_TEXT", text: TEXT });
  s = reduce(s, { type: "SCAN_START" });
  return reduce(s, { type: "SCAN_SUCCESS", runId: s.scan.runId, items, usedAI: false, failedChunks: 0 });
}

describe("workspaceReducer", () => {
  it("starts at step 1 with nothing", () => {
    expect(initialState).toMatchObject({ step: 1, text: "", items: [] });
  });

  it("moves to review after a successful scan", () => {
    const s = scanned();
    expect(s.step).toBe(2);
    expect(s.maxStep).toBe(2);
    expect(s.scan.status).toBe("done");
    expect(s.items).toHaveLength(1);
  });

  it("ignores stale scan results", () => {
    let s = reduce(initialState, { type: "SET_TEXT", text: TEXT });
    s = reduce(s, { type: "SCAN_START" });
    const stale = s.scan.runId;
    s = reduce(s, { type: "SCAN_START" });
    const after = reduce(s, { type: "SCAN_SUCCESS", runId: stale, items: [], usedAI: false, failedChunks: 0 });
    expect(after).toBe(s);
    expect(reduce(s, { type: "SCAN_ERROR", runId: stale, error: "x" })).toBe(s);
  });

  it("clears the review when the text changes", () => {
    const s = reduce(scanned(), { type: "SET_TEXT", text: "Something else." });
    expect(s).toMatchObject({ step: 1, maxStep: 1, items: [], text: "Something else." });
    expect(s.scan.status).toBe("idle");
  });

  it("keeps state when the same text is set again", () => {
    const s = scanned();
    expect(reduce(s, { type: "SET_TEXT", text: TEXT })).toBe(s);
  });

  it("toggles an item", () => {
    const s = scanned();
    const id = s.items[0].id;
    const off = reduce(s, { type: "TOGGLE_ITEM", id });
    expect(off.items[0].enabled).toBe(false);
    expect(reduce(off, { type: "TOGGLE_ITEM", id }).items[0].enabled).toBe(true);
  });

  it("adds a user item that occurs in the text, sorted by position", () => {
    const s = reduce(scanned(), { type: "ADD_ITEM", text: "  Rim Sassi ", itemType: "PERSON" });
    expect(s.items.map((i) => [i.text, i.origin])).toEqual([
      ["Rim Sassi", "user"],
      ["rim@example.com", "regex"],
    ]);
  });

  it("rejects an item that is not in the text", () => {
    const s = scanned();
    expect(reduce(s, { type: "ADD_ITEM", text: "Nobody Here", itemType: "PERSON" })).toBe(s);
  });

  it("re-enables and retypes an existing item instead of duplicating it", () => {
    let s = scanned();
    s = reduce(s, { type: "TOGGLE_ITEM", id: s.items[0].id });
    s = reduce(s, { type: "ADD_ITEM", text: "rim@example.com", itemType: "OTHER" });
    expect(s.items).toHaveLength(1);
    expect(s.items[0]).toMatchObject({ enabled: true, type: "OTHER" });
  });

  it("removes only user items", () => {
    let s = reduce(scanned(), { type: "ADD_ITEM", text: "Rim Sassi", itemType: "PERSON" });
    const regexId = s.items.find((i) => i.origin === "regex")!.id;
    const userId = s.items.find((i) => i.origin === "user")!.id;
    expect(reduce(s, { type: "REMOVE_ITEM", id: regexId }).items).toHaveLength(2);
    s = reduce(s, { type: "REMOVE_ITEM", id: userId });
    expect(s.items.map((i) => i.text)).toEqual(["rim@example.com"]);
  });

  it("keeps toggles and user items when the same text is scanned again", () => {
    let s = scanned();
    s = reduce(s, { type: "TOGGLE_ITEM", id: s.items[0].id });
    s = reduce(s, { type: "ADD_ITEM", text: "Rim Sassi", itemType: "PERSON" });
    s = reduce(s, { type: "SCAN_START" });
    s = reduce(s, {
      type: "SCAN_SUCCESS",
      runId: s.scan.runId,
      items: [it_("rim@example.com", "EMAIL")],
      usedAI: true,
      failedChunks: 0,
    });
    expect(s.items.map((i) => [i.text, i.enabled, i.origin])).toEqual([
      ["Rim Sassi", true, "user"],
      ["rim@example.com", false, "regex"],
    ]);
  });

  it("only goes to steps already reached", () => {
    const s = scanned();
    expect(reduce(s, { type: "GO_TO_STEP", step: 3 })).toBe(s);
    expect(reduce(s, { type: "GO_TO_STEP", step: 1 }).step).toBe(1);
  });

  it("records scan errors", () => {
    let s = reduce(initialState, { type: "SET_TEXT", text: TEXT });
    s = reduce(s, { type: "SCAN_START" });
    s = reduce(s, { type: "SCAN_ERROR", runId: s.scan.runId, error: "Boom" });
    expect(s.scan).toMatchObject({ status: "error", error: "Boom" });
    expect(s.step).toBe(1);
  });
});

describe("validateNewItem", () => {
  it("accepts a phrase that occurs as whole words", () => {
    expect(validateNewItem(TEXT, "Rim Sassi")).toBeNull();
  });

  it("rejects short, missing or partial-word text", () => {
    expect(validateNewItem(TEXT, "R")).toMatch(/at least 2/);
    expect(validateNewItem(TEXT, "Nobody")).toMatch(/not found/);
    expect(validateNewItem(TEXT, "Sass")).toMatch(/not found/);
  });
});
