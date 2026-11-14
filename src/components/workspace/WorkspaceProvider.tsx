"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { getDeviceStatus } from "@/lib/ai/device";
import { grantCloudConsent, hasCloudConsent } from "@/lib/consent";
import { leakCheck, mask, maskWithMap } from "@/lib/pii/mask";
import { scanDocument } from "@/lib/pii/scan";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { friendlyError } from "@/lib/tasks/errors";
import { buildPrompt } from "@/lib/tasks/prompts";
import { pickRoute } from "@/lib/tasks/router";
import { runTask } from "@/lib/tasks/run";
import type { TaskOptions } from "@/lib/tasks/types";
import {
  initialState,
  workspaceReducer,
  type WorkspaceAction,
  type WorkspaceState,
} from "@/lib/workspace/state";

/** What the consent dialog shows: exactly the prompt that would be sent. */
export interface ConsentRequest {
  prompt: string;
  reason: string;
}

interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  /** Scans the current text on this device (regex, plus Gemini Nano when available). */
  runScan: () => Promise<void>;
  /** Masks, routes, asks for cloud consent if needed, then runs the chosen task. */
  runCurrentTask: () => Promise<void>;
  consentRequest: ConsentRequest | null;
  answerConsent: (accepted: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const [consentRequest, setConsentRequest] = useState<ConsentRequest | null>(null);
  const consentResolver = useRef<((accepted: boolean) => void) | null>(null);
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

  const askConsent = useCallback((request: ConsentRequest) => {
    return new Promise<boolean>((resolve) => {
      consentResolver.current = resolve;
      setConsentRequest(request);
    });
  }, []);

  const answerConsent = useCallback((accepted: boolean) => {
    consentResolver.current?.(accepted);
    consentResolver.current = null;
    setConsentRequest(null);
  }, []);

  const runCurrentTask = useCallback(async () => {
    const s = latest.current;
    if (s.run.status === "running" || consentResolver.current) return;

    // The placeholder map lives only inside this call.
    const { masked, map } = mask(s.text, s.items);
    const options: TaskOptions = {
      style: s.task.style,
      language: s.task.language,
      question: s.task.kind === "ask" ? maskWithMap(s.task.question.trim(), map) : undefined,
    };
    const status = await getDeviceStatus();
    const route = pickRoute({ kind: s.task.kind, options }, masked, DEFAULT_SETTINGS, status);

    if (route.target === "cloud" && !hasCloudConsent()) {
      let prompt = "";
      try {
        prompt = buildPrompt(s.task.kind, masked, options);
      } catch {
        prompt = "";
      }
      // Only ask when the text is clean; a leak is blocked by runTask without any call.
      if (prompt && leakCheck(prompt, s.items).ok) {
        const accepted = await askConsent({ prompt, reason: route.reason });
        if (!accepted) return; // nothing sent
        grantCloudConsent();
      }
    }

    const runId = latest.current.run.runId + 1; // RUN_START increments runId by exactly one
    dispatch({ type: "RUN_START", route });
    try {
      const result = await runTask({
        task: s.task.kind,
        options,
        maskedText: masked,
        items: s.items,
        map,
        route,
        onUpdate: (text) => dispatch({ type: "RUN_UPDATE", runId, text }),
      });
      dispatch({ type: "RUN_SUCCESS", runId, result });
    } catch (err) {
      dispatch({ type: "RUN_ERROR", runId, error: friendlyError(err) });
    }
  }, [askConsent]);

  const value = useMemo(
    () => ({ state, dispatch, runScan, runCurrentTask, consentRequest, answerConsent }),
    [state, runScan, runCurrentTask, consentRequest, answerConsent],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>.");
  return ctx;
}
