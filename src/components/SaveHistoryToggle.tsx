"use client";

import { useId, useSyncExternalStore } from "react";
import { isSaveHistoryOn, setSaveHistory, subscribeSaveHistory } from "@/lib/historySetting";

/** Current "Save history" setting; false during server rendering and by default. */
export function useSaveHistory(): boolean {
  return useSyncExternalStore(subscribeSaveHistory, isSaveHistoryOn, () => false);
}

export function SaveHistoryToggle({ hint = true }: { hint?: boolean }) {
  const on = useSaveHistory();
  const hintId = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-describedby={hint ? hintId : undefined}
        onClick={() => setSaveHistory(!on)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-device ${
          on ? "bg-device" : "bg-slate-300"
        }`}
      >
        <span className="sr-only">Save history (masked text only)</span>
        <span
          aria-hidden="true"
          className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4.5" : "translate-x-0.5"}`}
        />
      </button>
      <div className="text-sm">
        <p className="font-medium" aria-hidden="true">
          Save history (masked text only)
        </p>
        {hint && (
          <p id={hintId} className="text-muted">
            Off by default. Only masked text is saved, in a private anonymous space that only this
            browser can open. Real values are never stored.
          </p>
        )}
      </div>
    </div>
  );
}
