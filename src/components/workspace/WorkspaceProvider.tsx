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
import { prepareHistoryRecord, saveResult } from "@/lib/history";
import { isSaveHistoryOn } from "@/lib/historySetting";
import { leakCheck, mask, visibleItemCounts } from "@/lib/pii/mask";
import type { PiiType } from "@/lib/pii/types";
import { scanDocument } from "@/lib/pii/scan";
import { recordLastAnswer } from "@/lib/diagnostics";
import { getSettings } from "@/lib/settings";
import { friendlyError } from "@/lib/tasks/errors";
import { buildPrompt } from "@/lib/tasks/prompts";
import { LeakError } from "@/lib/tasks/leak-error";
import { checkQuestion } from "@/lib/tasks/question";
import { pickRoute } from "@/lib/tasks/router";
import { runTask } from "@/lib/tasks/run";
import type { Route, TaskOptions } from "@/lib/tasks/types";
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
  /** Items the user chose to keep visible that are in the prompt, per type. */
  visible: Partial<Record<PiiType, number>>;
}

export interface RunOptions {
  /** After an on-device failure: run in the cloud (still masked, still asks for consent). */
  forceCloud?: boolean;
}

interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  /** Scans the current text on this device (regex, plus Gemini Nano when available). */
  runScan: () => Promise<void>;
  /** Masks, routes, asks for cloud consent if needed, then runs the chosen task. */
  runCurrentTask: (options?: RunOptions) => Promise<void>;
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
      const result = await scanDocument(text, status, getSettings());
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

  const runCurrentTask = useCallback(async ({ forceCloud = false }: RunOptions = {}) => {
    const s = latest.current;
    if (s.run.status === "running" || consentResolver.current) return;

    // The placeholder map lives only inside this call.
    const { masked, map } = mask(s.text, s.items);
    const status = await getDeviceStatus();

    // The question is typed by the user: scan it on the device too, and block if
    // anything personal in it would still be visible.
    let question: string | undefined;
    let questionLeak: LeakError | null = null;
    if (s.task.kind === "ask") {
      const scanned = await scanDocument(s.task.question, status, getSettings());
      const checked = checkQuestion(s.task.question, map, scanned.items);
      question = checked.masked;
      if (!checked.report.ok) questionLeak = new LeakError(checked.report.leaks, "question");
    }

    const options: TaskOptions = { style: s.task.style, language: s.task.language, question };
    const route: Route = forceCloud
      ? { target: "cloud", reason: "On-device AI could not answer → cloud" }
      : pickRoute({ kind: s.task.kind, options }, masked, getSettings(), status);

    if (questionLeak) {
      const runId = latest.current.run.runId + 1;
      dispatch({ type: "RUN_START", route });
      dispatch({ type: "RUN_ERROR", runId, error: friendlyError(questionLeak) });
      return; // nothing sent
    }

    if (route.target === "cloud" && !hasCloudConsent()) {
      let prompt = "";
      try {
        prompt = buildPrompt(s.task.kind, masked, options);
      } catch {
        prompt = "";
      }
      // Only ask when the text is clean; a leak is blocked by runTask without any call.
      if (prompt && leakCheck(prompt, s.items).ok) {
        const accepted = await askConsent({
          prompt,
          reason: route.reason,
          visible: visibleItemCounts(prompt, s.items),
        });
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
        // On-device tasks may fall back to the cloud only after the user agreed to cloud use.
        allowCloudFallback: hasCloudConsent(),
        onUpdate: (text) => dispatch({ type: "RUN_UPDATE", runId, text }),
      });
      dispatch({ type: "RUN_SUCCESS", runId, result });
      recordLastAnswer(result.source, result.reason);

      // Optional history: masked text only, refused if anything would leak.
      if (getSettings().history_enabled && isSaveHistoryOn()) {
        dispatch({ type: "RUN_HISTORY", runId, status: "saving" });
        try {
          await saveResult(prepareHistoryRecord(s.text, s.items, s.task.kind, result));
          dispatch({ type: "RUN_HISTORY", runId, status: "saved" });
        } catch (err) {
          dispatch(
            err instanceof LeakError
              ? { type: "RUN_HISTORY", runId, status: "blocked", message: "Not saved: personal data would have been stored." }
              : { type: "RUN_HISTORY", runId, status: "error", message: friendlyError(err).message },
          );
        }
      }
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
