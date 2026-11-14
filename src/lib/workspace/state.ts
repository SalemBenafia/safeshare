// Workspace state (SPEC §3 steps 1-3). Pure: no React, no browser APIs.
// The placeholder map is NEVER stored here; it is derived in memory when needed.
import { findOccurrences } from "../pii/text";
import { itemId, type PiiItem, type PiiType } from "../pii/types";

export type Step = 1 | 2 | 3 | 4;
export type ReviewTab = "highlights" | "masked";

export interface ScanState {
  status: "idle" | "scanning" | "done" | "error";
  runId: number;
  usedAI: boolean;
  failedChunks: number;
  error: string;
}

export interface WorkspaceState {
  step: Step;
  /** Highest step the user has reached; earlier steps can be revisited. */
  maxStep: Step;
  text: string;
  items: PiiItem[];
  scan: ScanState;
  reviewTab: ReviewTab;
}

export const initialState: WorkspaceState = {
  step: 1,
  maxStep: 1,
  text: "",
  items: [],
  scan: { status: "idle", runId: 0, usedAI: false, failedChunks: 0, error: "" },
  reviewTab: "highlights",
};

export type WorkspaceAction =
  | { type: "SET_TEXT"; text: string }
  | { type: "SCAN_START" }
  | { type: "SCAN_SUCCESS"; runId: number; items: PiiItem[]; usedAI: boolean; failedChunks: number }
  | { type: "SCAN_ERROR"; runId: number; error: string }
  | { type: "TOGGLE_ITEM"; id: string }
  | { type: "ADD_ITEM"; text: string; itemType: PiiType }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "SET_TAB"; tab: ReviewTab }
  | { type: "GO_TO_STEP"; step: Step };

/** Returns an error message, or null if `value` can be added as an item. */
export function validateNewItem(text: string, value: string): string | null {
  const v = value.trim();
  if (v.length < 2) return "Enter at least 2 characters.";
  if (findOccurrences(text, v).length === 0) {
    return "This text was not found in the document as a whole word or phrase.";
  }
  return null;
}

function byPosition(text: string, items: PiiItem[]): PiiItem[] {
  const pos = (i: PiiItem) => text.indexOf(i.text);
  return [...items].sort((a, b) => pos(a) - pos(b));
}

/** Keeps the user's review choices when the same document is scanned again. */
function mergeRescan(text: string, previous: PiiItem[], found: PiiItem[]): PiiItem[] {
  const prevByText = new Map(previous.map((i) => [i.text, i]));
  const merged = found.map((item) => {
    const prev = prevByText.get(item.text);
    return prev ? { ...item, enabled: prev.enabled } : item;
  });
  const foundTexts = new Set(found.map((i) => i.text));
  for (const prev of previous) {
    if (prev.origin === "user" && !foundTexts.has(prev.text) && findOccurrences(text, prev.text).length) {
      merged.push(prev);
    }
  }
  return byPosition(text, merged);
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "SET_TEXT":
      if (action.text === state.text) return state;
      return { ...initialState, text: action.text, scan: { ...initialState.scan, runId: state.scan.runId } };

    case "SCAN_START":
      return {
        ...state,
        scan: { ...state.scan, status: "scanning", runId: state.scan.runId + 1, error: "" },
      };

    case "SCAN_SUCCESS":
      if (action.runId !== state.scan.runId) return state; // stale result
      return {
        ...state,
        items: mergeRescan(state.text, state.items, action.items),
        scan: {
          ...state.scan,
          status: "done",
          usedAI: action.usedAI,
          failedChunks: action.failedChunks,
          error: "",
        },
        step: 2,
        maxStep: state.maxStep < 2 ? 2 : state.maxStep,
        reviewTab: "highlights",
      };

    case "SCAN_ERROR":
      if (action.runId !== state.scan.runId) return state;
      return { ...state, scan: { ...state.scan, status: "error", error: action.error } };

    case "TOGGLE_ITEM":
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? { ...i, enabled: !i.enabled } : i)),
      };

    case "ADD_ITEM": {
      const value = action.text.trim();
      if (validateNewItem(state.text, value)) return state;
      const existing = state.items.find((i) => i.text === value);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i === existing ? { ...i, enabled: true, type: action.itemType } : i,
          ),
        };
      }
      const added: PiiItem = {
        id: itemId(value),
        text: value,
        type: action.itemType,
        enabled: true,
        origin: "user",
      };
      return { ...state, items: byPosition(state.text, [...state.items, added]) };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => !(i.id === action.id && i.origin === "user")),
      };

    case "SET_TAB":
      return { ...state, reviewTab: action.tab };

    case "GO_TO_STEP":
      if (action.step > state.maxStep) return state;
      return { ...state, step: action.step };
  }
}
