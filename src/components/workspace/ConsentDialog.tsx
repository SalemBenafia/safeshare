"use client";

import { useEffect, useRef } from "react";
import { TYPE_LABELS } from "@/lib/pii/labels";
import type { PiiType } from "@/lib/pii/types";
import { useWorkspace } from "./WorkspaceProvider";

const PLACEHOLDER = /(\[[A-Z_]+_\d+\])/;

/** Shown before the first cloud call of the session, with exactly what will be sent. */
export function ConsentDialog() {
  const { consentRequest, answerConsent } = useWorkspace();
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (consentRequest && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!consentRequest && dialog.open) {
      dialog.close();
    }
  }, [consentRequest]);

  const chars = consentRequest?.prompt.length ?? 0;
  const visible = Object.entries(consentRequest?.visible ?? {}) as [PiiType, number][];
  const visibleTotal = visible.reduce((sum, [, n]) => sum + n, 0);
  const visibleSummary = visible.map(([type, n]) => `${TYPE_LABELS[type]}: ${n}`).join(", ");

  return (
    <dialog
      ref={ref}
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      onCancel={(e) => {
        // Esc = Cancel
        e.preventDefault();
        answerConsent(false);
      }}
      className="m-auto w-[min(48rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60"
    >
      {consentRequest && (
        <div className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 id="consent-title" className="flex items-center gap-2 text-xl font-semibold">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-cloud-fill" />
              Send masked text to the cloud?
            </h2>
            <p id="consent-desc" className="text-sm text-muted">
              {consentRequest.reason}. Below is exactly what will be sent to Gemini in the cloud.
              Personal data is replaced by placeholders; real values stay on this device.
            </p>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Text that will be sent"
            className="max-h-[45vh] overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-canvas p-4 font-mono text-sm leading-6 focus-visible:outline-2 focus-visible:outline-cloud"
          >
            {consentRequest.prompt.split(PLACEHOLDER).map((part, i) =>
              i % 2 === 1 ? (
                <span key={i} className="rounded-sm bg-cloud-soft px-0.5 font-semibold text-cloud">
                  {part}
                </span>
              ) : (
                part
              ),
            )}
          </div>

          <p className="text-sm font-medium">
            {chars.toLocaleString("en")} characters will be sent.{" "}
            {visibleTotal === 0
              ? "No personal items are included."
              : `${visibleTotal} ${visibleTotal === 1 ? "item" : "items"} you chose to keep visible ${visibleTotal === 1 ? "is" : "are"} included (${visibleSummary}).`}
          </p>
          <p className="text-xs text-muted">We ask once per browser session.</p>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={() => answerConsent(false)}
              className="rounded-lg border border-line bg-surface px-4 py-2 font-medium hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cloud"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => answerConsent(true)}
              className="rounded-lg bg-cloud-fill px-4 py-2 font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cloud"
            >
              Send masked text to cloud
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
