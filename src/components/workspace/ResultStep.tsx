"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SaveHistoryToggle } from "@/components/SaveHistoryToggle";
import { SourceBadge } from "@/components/SourceBadge";
import { useSettings } from "@/hooks/useSettings";
import type { HistorySaveState } from "@/lib/workspace/state";
import { PrivacyReport } from "./PrivacyReport";
import { useWorkspace } from "./WorkspaceProvider";

function HistoryStatus({ status, message }: HistorySaveState) {
  if (status === "off") return null;
  const text =
    status === "saving" ? (
      "Saving the masked result to history…"
    ) : status === "saved" ? (
      <>
        Saved to <Link href="/history/" className="underline underline-offset-2">history</Link> (masked text only).
      </>
    ) : (
      message
    );
  return (
    <p
      role={status === "blocked" || status === "error" ? "alert" : "status"}
      className={`text-sm ${status === "saved" ? "text-device" : status === "saving" ? "text-muted" : "text-warn"}`}
    >
      {text}
    </p>
  );
}

export function ResultStep() {
  const { state, dispatch } = useWorkspace();
  const { run } = state;
  const { history_enabled: historyEnabled } = useSettings();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const result = run.result;
  const text = result?.text ?? run.partial;
  const fellBack = run.route?.target === "hybrid" && result?.source === "IN_CLOUD";

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    if (!result) return;
    const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safeshare-${state.task.kind}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section aria-labelledby="result-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="result-title" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
          4. Result
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "GO_TO_STEP", step: 3 })}
            disabled={run.status === "running"}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-50"
          >
            New task
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {run.status === "done" ? "Answer ready." : run.status === "error" ? "The task failed." : ""}
      </p>

      {run.status === "error" && run.error ? (
        <div role="alert" className="space-y-3 rounded-xl border border-warn/40 bg-warn-soft p-5 text-warn">
          <h3 className="font-semibold">{run.error.title}</h3>
          <p className="text-sm">{run.error.message}</p>
          <button
            type="button"
            onClick={() => dispatch({ type: "GO_TO_STEP", step: run.error?.kind === "leak" ? 2 : 3 })}
            className="rounded-lg border border-warn/40 bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas"
          >
            {run.error.kind === "leak" ? "Back to review" : "Back to task"}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {result ? (
                <SourceBadge source={result.source} reason={result.reason} />
              ) : (
                <span className="inline-flex items-center gap-2 text-sm text-muted">
                  <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-device border-t-transparent" />
                  Generating…
                </span>
              )}
              {run.route && <span className="text-sm text-muted">{run.route.reason}</span>}
            </div>
            {fellBack && (
              <p className="text-sm text-cloud">
                The on-device model could not answer, so the masked text was sent to the cloud instead.
              </p>
            )}

            <div
              dir="auto"
              aria-busy={run.status === "running"}
              aria-label="Answer"
              role="region"
              tabIndex={0}
              className="min-h-40 whitespace-pre-wrap rounded-xl border border-line bg-surface p-5 text-[16px] leading-7 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-device"
            >
              {text || <span className="text-muted">Waiting for the first words…</span>}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copy()}
                disabled={!result}
                className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-50"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!result}
                className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-50"
              >
                Download .txt
              </button>
              <span className="sr-only" aria-live="polite">
                {copied ? "Answer copied to the clipboard." : ""}
              </span>
            </div>
            <HistoryStatus status={run.history.status} message={run.history.message} />
          </div>

          <aside aria-label="Privacy report" className="space-y-4">
            {historyEnabled && (
              <div className="rounded-xl border border-line bg-surface p-4">
                <SaveHistoryToggle hint={false} />
              </div>
            )}
            {result ? (
              <PrivacyReport items={state.items} usedAI={state.scan.usedAI} result={result} />
            ) : (
              <div className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
                The privacy report appears when the answer is complete.
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
