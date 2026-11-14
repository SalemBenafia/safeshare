"use client";

import { useEffect } from "react";
import { useWorkspace } from "./WorkspaceProvider";

const AUTO_DISMISS_MS = 8000;

/** "… will be shown to the AI. Undo" after an item change in Review. */
export function UndoToast() {
  const { state, dispatch } = useWorkspace();
  const change = state.lastChange;

  useEffect(() => {
    if (!change) return;
    const t = setTimeout(() => dispatch({ type: "DISMISS_UNDO" }), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [change, dispatch]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      {change && (
        <div className="pointer-events-auto flex items-center gap-4 rounded-xl bg-ink px-4 py-3 text-sm text-surface shadow-lg">
          <span>{change.message}</span>
          <button
            type="button"
            onClick={() => dispatch({ type: "UNDO" })}
            className="rounded-md px-2 py-1 font-semibold underline underline-offset-2 hover:bg-white/10"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "DISMISS_UNDO" })}
            aria-label="Dismiss"
            className="rounded-md px-1.5 py-1 opacity-80 hover:bg-white/10 hover:opacity-100"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </div>
  );
}
