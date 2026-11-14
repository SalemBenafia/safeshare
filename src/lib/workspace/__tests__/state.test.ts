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

describe("workspaceReducer: group toggle", () => {
  const DATES_TEXT = "Signed 10 January 2026 by Rim Sassi, ends 31 July 2026.";

  function withDates(): WorkspaceState {
    let s = reduce(initialState, { type: "SET_TEXT", text: DATES_TEXT });
    s = reduce(s, { type: "SCAN_START" });
    return reduce(s, {
      type: "SCAN_SUCCESS",
      runId: s.scan.runId,
      items: [it_("10 January 2026", "DATE"), it_("Rim Sassi", "PERSON", "ai"), it_("31 July 2026", "DATE")],
      usedAI: true,
      failedChunks: 0,
    });
  }

  it("disables every DATE item in one action and leaves other types alone", () => {
    const s = reduce(withDates(), { type: "SET_TYPE_ENABLED", itemType: "DATE", enabled: false });
    expect(s.items.map((i) => [i.text, i.enabled])).toEqual([
      ["10 January 2026", false],
      ["Rim Sassi", true],
      ["31 July 2026", false],
    ]);
  });

  it("re-enables them all", () => {
    let s = reduce(withDates(), { type: "SET_TYPE_ENABLED", itemType: "DATE", enabled: false });
    s = reduce(s, { type: "TOGGLE_ITEM", id: s.items[0].id });
    s = reduce(s, { type: "SET_TYPE_ENABLED", itemType: "DATE", enabled: true });
    expect(s.items.filter((i) => i.type === "DATE").every((i) => i.enabled)).toBe(true);
  });

  it("is a no-op when nothing changes", () => {
    const s = withDates();
    expect(reduce(s, { type: "SET_TYPE_ENABLED", itemType: "DATE", enabled: true })).toBe(s);
    expect(reduce(s, { type: "SET_TYPE_ENABLED", itemType: "EMAIL", enabled: false })).toBe(s);
  });

  it("drops an existing result", () => {
    let s = reduce(withDates(), { type: "CONTINUE_TO_TASK" });
    s = reduce(s, { type: "RUN_START", route: { target: "hybrid", reason: "Short task → on-device" } });
    s = reduce(s, { type: "SET_TYPE_ENABLED", itemType: "DATE", enabled: false });
    expect(s.run.status).toBe("idle");
    expect(s.maxStep).toBe(3);
  });
});

describe("workspaceReducer: tasks and results", () => {
  const route = { target: "hybrid", reason: "Short task → on-device" } as const;
  const result = { text: "Done", maskedText: "Done", source: "ON_DEVICE", reason: route.reason, maskedChars: 120 } as const;

  function atTask(): WorkspaceState {
    return reduce(scanned(), { type: "CONTINUE_TO_TASK" });
  }

  function finished(): WorkspaceState {
    let s = reduce(atTask(), { type: "RUN_START", route });
    s = reduce(s, { type: "RUN_SUCCESS", runId: s.run.runId, result });
    return s;
  }

  it("continues to the task step only after a scan", () => {
    expect(reduce(initialState, { type: "CONTINUE_TO_TASK" })).toBe(initialState);
    expect(atTask()).toMatchObject({ step: 3, maxStep: 3 });
  });

  it("streams, then finishes on the result step", () => {
    let s = reduce(atTask(), { type: "RUN_START", route });
    expect(s).toMatchObject({ step: 4, maxStep: 4, run: { status: "running", route } });
    s = reduce(s, { type: "RUN_UPDATE", runId: s.run.runId, text: "Do" });
    expect(s.run.partial).toBe("Do");
    s = reduce(s, { type: "RUN_SUCCESS", runId: s.run.runId, result });
    expect(s.run).toMatchObject({ status: "done", result, partial: "Done" });
  });

  it("ignores updates from an older run", () => {
    let s = reduce(atTask(), { type: "RUN_START", route });
    const old = s.run.runId;
    s = reduce(s, { type: "RUN_START", route });
    expect(reduce(s, { type: "RUN_UPDATE", runId: old, text: "x" })).toBe(s);
    expect(reduce(s, { type: "RUN_SUCCESS", runId: old, result })).toBe(s);
    expect(reduce(s, { type: "RUN_ERROR", runId: old, error: { kind: "unknown", title: "", message: "" } })).toBe(s);
  });

  it("tracks saving to history for the current run only", () => {
    let s = finished();
    expect(s.run.history.status).toBe("off");
    s = reduce(s, { type: "RUN_HISTORY", runId: s.run.runId, status: "saving" });
    expect(s.run.history).toEqual({ status: "saving", message: "" });
    s = reduce(s, { type: "RUN_HISTORY", runId: s.run.runId, status: "blocked", message: "Not saved" });
    expect(s.run.history).toEqual({ status: "blocked", message: "Not saved" });
    expect(reduce(s, { type: "RUN_HISTORY", runId: s.run.runId - 1, status: "saved" })).toBe(s);
  });

  it("ignores history updates for a run that is not done", () => {
    const s = reduce(atTask(), { type: "RUN_START", route });
    expect(reduce(s, { type: "RUN_HISTORY", runId: s.run.runId, status: "saved" })).toBe(s);
  });

  it("records a friendly error", () => {
    let s = reduce(atTask(), { type: "RUN_START", route });
    const error = { kind: "offline", title: "Offline", message: "Try later" } as const;
    s = reduce(s, { type: "RUN_ERROR", runId: s.run.runId, error });
    expect(s.run).toMatchObject({ status: "error", error });
  });

  it("drops the result when an item changes", () => {
    const s = reduce(finished(), { type: "TOGGLE_ITEM", id: finished().items[0].id });
    expect(s.run.status).toBe("idle");
    expect(s.maxStep).toBe(3);
  });

  it("drops the result when the task changes, and stays on the task step", () => {
    const s = reduce(finished(), { type: "SET_TASK", patch: { kind: "translate", language: "ar" } });
    expect(s).toMatchObject({ step: 3, maxStep: 3, task: { kind: "translate", language: "ar" } });
    expect(s.run.result).toBeNull();
  });

  it("keeps the chosen task when the text changes, but clears everything else", () => {
    let s = reduce(finished(), { type: "SET_TASK", patch: { kind: "rewrite", style: "simple" } });
    s = reduce(s, { type: "SET_TEXT", text: "New text." });
    expect(s).toMatchObject({ step: 1, maxStep: 1, items: [], task: { kind: "rewrite", style: "simple" } });
    expect(s.run.status).toBe("idle");
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
