"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { getDeviceStatus } from "@/lib/ai/device";
import { scanDocument } from "@/lib/pii/scan";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import {
  initialState,
  workspaceReducer,
  type WorkspaceAction,
  type WorkspaceState,
} from "@/lib/workspace/state";

interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  /** Scans the current text on this device (regex, plus Gemini Nano when available). */
  runScan: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  const runScan = useCallback(async () => {
    const { text, scan } = latest.current;
    if (!text.trim() || scan.status === "scanning") return;
    const runId = scan.runId + 1; // SCAN_START increments runId by exactly one
    dispatch({ type: "SCAN_START" });
    try {
      const status = await getDeviceStatus();
      const result = await scanDocument(text, status, DEFAULT_SETTINGS);
      dispatch({ type: "SCAN_SUCCESS", runId, ...result });
    } catch (err) {
      dispatch({
        type: "SCAN_ERROR",
        runId,
        error: err instanceof Error ? err.message : "The scan failed.",
      });
    }
  }, []);

  const value = useMemo(() => ({ state, dispatch, runScan }), [state, runScan]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>.");
  return ctx;
}
