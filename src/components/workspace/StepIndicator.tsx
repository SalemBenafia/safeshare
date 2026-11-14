"use client";

import type { Step } from "@/lib/workspace/state";
import { useWorkspace } from "./WorkspaceProvider";

const STEPS: { n: Step; label: string; available: boolean }[] = [
  { n: 1, label: "Input", available: true },
  { n: 2, label: "Review", available: true },
  { n: 3, label: "Task", available: true },
  { n: 4, label: "Result", available: true },
];

export function StepIndicator() {
  const { state, dispatch } = useWorkspace();

  return (
    <nav aria-label="Progress">
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map(({ n, label, available }) => {
          const current = state.step === n;
          const reached = n <= state.maxStep && available;
          const tone = current
            ? "border-device bg-device-soft text-device"
            : reached
              ? "border-line bg-surface text-ink"
              : "border-line bg-canvas text-muted";
          const inner = (
            <>
              <span
                aria-hidden="true"
                className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  current ? "bg-device text-white" : "bg-canvas text-muted ring-1 ring-line"
                }`}
              >
                {n}
              </span>
              <span className="font-medium">{label}</span>
              {!available && <span className="ml-auto text-xs text-muted">Soon</span>}
              <span className="sr-only">
                {current ? " (current step)" : reached ? "" : " (not available yet)"}
              </span>
            </>
          );
          const box = `flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm ${tone}`;
          return (
            <li key={n}>
              {reached && !current ? (
                <button
                  type="button"
                  className={`${box} text-left hover:bg-canvas`}
                  onClick={() => dispatch({ type: "GO_TO_STEP", step: n })}
                >
                  {inner}
                </button>
              ) : (
                <div className={box} aria-current={current ? "step" : undefined}>
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
