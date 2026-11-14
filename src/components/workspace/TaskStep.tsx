"use client";

import { useEffect, useMemo, useRef } from "react";
import { useDeviceStatus } from "@/hooks/useDeviceStatus";
import { mask } from "@/lib/pii/mask";
import { useSettings } from "@/hooks/useSettings";
import { LANGUAGE_NAMES } from "@/lib/tasks/prompts";
import { pickRoute } from "@/lib/tasks/router";
import type { TargetLanguage, TaskKind } from "@/lib/tasks/types";
import { useWorkspace } from "./WorkspaceProvider";

const TASKS: { kind: TaskKind; label: string; hint: string }[] = [
  { kind: "summarise", label: "Summarise", hint: "Key points in a few bullets" },
  { kind: "rewrite", label: "Rewrite", hint: "Formal or simple language" },
  { kind: "translate", label: "Translate", hint: "English, French or Arabic" },
  { kind: "ask", label: "Ask a question", hint: "Answered from the document" },
];

export function TaskStep() {
  const { state, dispatch, runCurrentTask, consentRequest } = useWorkspace();
  const { status: deviceStatus } = useDeviceStatus();
  const settings = useSettings();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { task } = state;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const masked = useMemo(() => mask(state.text, state.items).masked, [state.text, state.items]);
  const route =
    deviceStatus === "checking"
      ? null
      : pickRoute({ kind: task.kind, options: { language: task.language } }, masked, settings, deviceStatus);

  const canRun = task.kind !== "ask" || task.question.trim().length > 0;
  const busy = state.run.status === "running" || consentRequest !== null;

  return (
    <section
      aria-labelledby="task-title"
      className="space-y-6"
      onKeyDown={(e) => {
        // Ctrl+Enter (or Cmd+Enter) runs the task from anywhere in this step.
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canRun && !busy) {
          e.preventDefault();
          void runCurrentTask();
        }
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="task-title" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
            3. Choose a task
          </h2>
          <p className="text-sm text-muted">The AI only ever receives the masked text.</p>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "GO_TO_STEP", step: 2 })}
          className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas"
        >
          Back to review
        </button>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">Task</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TASKS.map((t) => {
            const checked = task.kind === t.kind;
            return (
              <label
                key={t.kind}
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-device ${
                  checked ? "border-device bg-device-soft" : "border-line bg-surface hover:bg-canvas"
                }`}
              >
                <input
                  type="radio"
                  name="task"
                  value={t.kind}
                  checked={checked}
                  onChange={() => dispatch({ type: "SET_TASK", patch: { kind: t.kind } })}
                  className="mt-1 accent-device"
                />
                <span>
                  <span className="block font-medium">{t.label}</span>
                  <span className="block text-sm text-muted">{t.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {task.kind === "rewrite" && (
        <fieldset className="space-y-2">
          <legend className="mb-1 font-semibold">Style</legend>
          <div className="flex gap-4">
            {(["formal", "simple"] as const).map((style) => (
              <label key={style} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="style"
                  value={style}
                  checked={task.style === style}
                  onChange={() => dispatch({ type: "SET_TASK", patch: { style } })}
                  className="accent-device"
                />
                {style === "formal" ? "Formal" : "Simple"}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {task.kind === "translate" && (
        <div className="max-w-xs space-y-1">
          <label htmlFor="task-lang" className="font-semibold">
            Translate into
          </label>
          <select
            id="task-lang"
            value={task.language}
            onChange={(e) => dispatch({ type: "SET_TASK", patch: { language: e.target.value as TargetLanguage } })}
            className="block w-full rounded-md border border-line-strong bg-surface px-3 py-2 focus:outline-2 focus:outline-device"
          >
            {(Object.keys(LANGUAGE_NAMES) as TargetLanguage[]).map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_NAMES[l]}
              </option>
            ))}
          </select>
        </div>
      )}

      {task.kind === "ask" && (
        <div className="max-w-2xl space-y-1">
          <label htmlFor="task-question" className="font-semibold">
            Your question
          </label>
          <textarea
            id="task-question"
            value={task.question}
            onChange={(e) => dispatch({ type: "SET_TASK", patch: { question: e.target.value } })}
            rows={3}
            dir="auto"
            aria-describedby="task-question-hint"
            className="block w-full rounded-md border border-line-strong bg-surface p-3 focus:outline-2 focus:outline-device"
          />
          <p id="task-question-hint" className="text-sm text-muted">
            Names and details already found are masked automatically. Please don&apos;t type new
            personal details here.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => void runCurrentTask()}
          disabled={!canRun || busy}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          className={`rounded-lg px-6 py-3 font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50 ${
            route?.target === "cloud" ? "bg-cloud-fill" : "bg-device-fill"
          }`}
        >
          {route?.target === "cloud" ? "Run in the cloud" : route?.target === "hybrid" ? "Run on this device" : "Run task"}
        </button>
        <kbd className="hidden rounded border border-line-strong px-1.5 py-0.5 font-mono text-xs text-muted sm:inline">
          Ctrl + Enter
        </kbd>
        <p className="text-sm" aria-live="polite">
          {!canRun ? (
            <span className="text-muted">Type a question first.</span>
          ) : route === null ? (
            <span className="text-muted">Checking where this task can run…</span>
          ) : route.target === "hybrid" ? (
            <span className="text-device">Will run on this device · {route.reason}</span>
          ) : (
            <span className="text-cloud">
              Will run in the cloud (masked text only) · {route.reason}
            </span>
          )}
        </p>
      </div>
    </section>
  );
}
