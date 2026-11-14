// Workspace state (SPEC §3). Pure: no React, no browser APIs.
// The placeholder map is NEVER stored here; it is derived in memory when needed.
import { findOccurrences } from "../pii/text";
import { TYPE_LABELS } from "../pii/labels";
import { itemId, type PiiItem, type PiiType } from "../pii/types";
import type { FriendlyError } from "../tasks/errors";
import type { RewriteStyle, Route, TargetLanguage, TaskKind, TaskResult } from "../tasks/types";

export type Step = 1 | 2 | 3 | 4;
export type ReviewTab = "highlights" | "masked";

export interface ScanState {
  status: "idle" | "scanning" | "done" | "error";
  runId: number;
  usedAI: boolean;
  failedChunks: number;
  error: string;
}

export interface TaskState {
  kind: TaskKind;
  style: RewriteStyle;
  language: TargetLanguage;
  /** Raw question as typed; masked with the document map just before running. */
  question: string;
}

export interface HistorySaveState {
  /** "off": history not enabled for this run. */
  status: "off" | "saving" | "saved" | "blocked" | "error";
  message: string;
}

export interface RunState {
  status: "idle" | "running" | "done" | "error";
  runId: number;
  route: Route | null;
  /** Unmasked answer so far, while streaming. */
  partial: string;
  result: TaskResult | null;
  error: FriendlyError | null;
  history: HistorySaveState;
}

export interface WorkspaceState {
  step: Step;
  /** Highest step the user has reached; earlier steps can be revisited. */
  maxStep: Step;
  text: string;
  items: PiiItem[];
  scan: ScanState;
  reviewTab: ReviewTab;
  /** The last item change in Review, so it can be undone. Memory only. */
  lastChange: { previous: PiiItem[]; message: string } | null;
  task: TaskState;
  run: RunState;
}

const idleRun: RunState = {
  status: "idle",
  runId: 0,
  route: null,
  partial: "",
  result: null,
  error: null,
  history: { status: "off", message: "" },
};

export const initialState: WorkspaceState = {
  step: 1,
  maxStep: 1,
  text: "",
  items: [],
  scan: { status: "idle", runId: 0, usedAI: false, failedChunks: 0, error: "" },
  reviewTab: "highlights",
  lastChange: null,
  task: { kind: "summarise", style: "formal", language: "fr", question: "" },
  run: idleRun,
};

export type WorkspaceAction =
  | { type: "SET_TEXT"; text: string }
  | { type: "SCAN_START" }
  | { type: "SCAN_SUCCESS"; runId: number; items: PiiItem[]; usedAI: boolean; failedChunks: number }
  | { type: "SCAN_ERROR"; runId: number; error: string }
  | { type: "TOGGLE_ITEM"; id: string }
  | { type: "SET_TYPE_ENABLED"; itemType: PiiType; enabled: boolean }
  | { type: "ADD_ITEM"; text: string; itemType: PiiType }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "SET_TAB"; tab: ReviewTab }
  | { type: "UNDO" }
  | { type: "DISMISS_UNDO" }
  | { type: "GO_TO_STEP"; step: Step }
  | { type: "CONTINUE_TO_TASK" }
  | { type: "SET_TASK"; patch: Partial<TaskState> }
  | { type: "RUN_START"; route: Route }
  | { type: "RUN_UPDATE"; runId: number; text: string }
  | { type: "RUN_SUCCESS"; runId: number; result: TaskResult }
  | { type: "RUN_ERROR"; runId: number; error: FriendlyError }
  | { type: "RUN_HISTORY"; runId: number; status: HistorySaveState["status"]; message?: string };

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

/** A result is only valid for the exact items and task it was made with. */
function invalidateRun(state: WorkspaceState): Pick<WorkspaceState, "run" | "maxStep" | "step"> {
  const cap = (s: Step): Step => (s > 3 ? 3 : s);
  return {
    run: { ...idleRun, runId: state.run.runId },
    maxStep: cap(state.maxStep),
    step: cap(state.step),
  };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "SET_TEXT":
      if (action.text === state.text) return state;
      return {
        ...initialState,
        text: action.text,
        task: state.task,
        scan: { ...initialState.scan, runId: state.scan.runId },
        run: { ...idleRun, runId: state.run.runId },
      };

    case "SCAN_START":
      return {
        ...state,
        scan: { ...state.scan, status: "scanning", runId: state.scan.runId + 1, error: "" },
      };

    case "SCAN_SUCCESS":
      if (action.runId !== state.scan.runId) return state; // stale result
      return {
        ...state,
        ...invalidateRun(state),
        items: mergeRescan(state.text, state.items, action.items),
        scan: {
          ...state.scan,
          status: "done",
          usedAI: action.usedAI,
          failedChunks: action.failedChunks,
          error: "",
        },
        step: 2,
        maxStep: state.maxStep < 2 ? 2 : state.maxStep > 3 ? 3 : state.maxStep,
        reviewTab: "highlights",
        lastChange: null,
      };

    case "SCAN_ERROR":
      if (action.runId !== state.scan.runId) return state;
      return { ...state, scan: { ...state.scan, status: "error", error: action.error } };

    case "TOGGLE_ITEM": {
      const target = state.items.find((i) => i.id === action.id);
      if (!target) return state;
      return {
        ...state,
        ...invalidateRun(state),
        items: state.items.map((i) => (i === target ? { ...i, enabled: !i.enabled } : i)),
        lastChange: {
          previous: state.items,
          message: `“${target.text}” will ${target.enabled ? "be shown to the AI" : "be masked"}.`,
        },
      };
    }

    case "SET_TYPE_ENABLED": {
      if (!state.items.some((i) => i.type === action.itemType && i.enabled !== action.enabled)) return state;
      return {
        ...state,
        ...invalidateRun(state),
        items: state.items.map((i) => (i.type === action.itemType ? { ...i, enabled: action.enabled } : i)),
        lastChange: {
          previous: state.items,
          message: `All ${TYPE_LABELS[action.itemType].toLowerCase()} will ${action.enabled ? "be masked" : "be shown to the AI"}.`,
        },
      };
    }

    case "ADD_ITEM": {
      const value = action.text.trim();
      if (validateNewItem(state.text, value)) return state;
      const existing = state.items.find((i) => i.text === value);
      if (existing) {
        return {
          ...state,
          ...invalidateRun(state),
          items: state.items.map((i) =>
            i === existing ? { ...i, enabled: true, type: action.itemType } : i,
          ),
          lastChange: null,
        };
      }
      const added: PiiItem = {
        id: itemId(value),
        text: value,
        type: action.itemType,
        enabled: true,
        origin: "user",
      };
      return {
        ...state,
        ...invalidateRun(state),
        items: byPosition(state.text, [...state.items, added]),
        lastChange: null,
      };
    }

    case "REMOVE_ITEM": {
      const target = state.items.find((i) => i.id === action.id && i.origin === "user");
      if (!target) return state;
      return {
        ...state,
        ...invalidateRun(state),
        items: state.items.filter((i) => i !== target),
        lastChange: { previous: state.items, message: `Removed “${target.text}”.` },
      };
    }

    case "UNDO":
      if (!state.lastChange) return state;
      return { ...state, ...invalidateRun(state), items: state.lastChange.previous, lastChange: null };

    case "DISMISS_UNDO":
      return state.lastChange ? { ...state, lastChange: null } : state;

    case "SET_TAB":
      return { ...state, reviewTab: action.tab };

    case "GO_TO_STEP":
      if (action.step > state.maxStep) return state;
      return { ...state, step: action.step };

    case "CONTINUE_TO_TASK":
      if (state.scan.status !== "done") return state;
      return { ...state, lastChange: null, step: 3, maxStep: state.maxStep < 3 ? 3 : state.maxStep };

    case "SET_TASK":
      return { ...state, ...invalidateRun(state), task: { ...state.task, ...action.patch }, step: 3 };

    case "RUN_START":
      return {
        ...state,
        run: { ...idleRun, status: "running", runId: state.run.runId + 1, route: action.route },
        step: 4,
        maxStep: 4,
      };

    case "RUN_UPDATE":
      if (action.runId !== state.run.runId || state.run.status !== "running") return state;
      return { ...state, run: { ...state.run, partial: action.text } };

    case "RUN_SUCCESS":
      if (action.runId !== state.run.runId) return state;
      return {
        ...state,
        run: { ...state.run, status: "done", partial: action.result.text, result: action.result },
      };

    case "RUN_ERROR":
      if (action.runId !== state.run.runId) return state;
      return { ...state, run: { ...state.run, status: "error", error: action.error } };

    case "RUN_HISTORY":
      if (action.runId !== state.run.runId || state.run.status !== "done") return state;
      return {
        ...state,
        run: { ...state.run, history: { status: action.status, message: action.message ?? "" } },
      };
  }
}
