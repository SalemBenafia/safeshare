"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { ImageInput } from "./ImageInput";
import { SampleMenu } from "./SampleMenu";
import { ScanStatus } from "./ScanStatus";
import { useWorkspace } from "./WorkspaceProvider";

export function InputStep() {
  const { state, dispatch, runScan } = useWorkspace();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scanning = state.scan.status === "scanning";
  const chars = state.text.length;
  const canReturn = state.maxStep >= 2 && state.scan.status === "done";

  // When coming back from Review, move focus to this step for screen readers.
  // Captured once at mount, so typing (which resets maxStep) does not move focus.
  const [returning] = useState(() => state.maxStep >= 2);
  useEffect(() => {
    if (returning) headingRef.current?.focus();
  }, [returning]);

  return (
    <section aria-labelledby="input-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="input-title" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
            1. Your document
          </h2>
          <p className="text-sm text-muted">
            Paste text, load a sample, or read a photo. It stays in this browser tab.
          </p>
        </div>
        <SampleMenu disabled={scanning} />
      </div>

      <div>
        <label htmlFor="doc-text" className="sr-only">
          Document text
        </label>
        <textarea
          id="doc-text"
          value={state.text}
          onChange={(e) => dispatch({ type: "SET_TEXT", text: e.target.value })}
          readOnly={scanning}
          aria-describedby="doc-count"
          rows={18}
          spellCheck={false}
          placeholder="Paste a CV, a letter, a contract…"
          className="block w-full resize-y rounded-xl border border-line bg-surface p-4 font-mono text-[15px] leading-relaxed text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-device read-only:bg-canvas"
        />
        <p id="doc-count" className="mt-1 text-sm text-muted">
          {chars.toLocaleString("en")} {chars === 1 ? "character" : "characters"}
          {chars > DEFAULT_SETTINGS.device_max_chars &&
            " · Long document: some tasks may use the cloud later (masked text only)."}
        </p>
      </div>

      <ImageInput busy={scanning} />

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void runScan()}
          disabled={scanning || !state.text.trim()}
          className="rounded-lg bg-device px-5 py-3 font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-device disabled:opacity-50"
        >
          {scanning ? "Scanning…" : "Scan for personal data"}
        </button>
        {canReturn && !scanning && (
          <button
            type="button"
            onClick={() => dispatch({ type: "GO_TO_STEP", step: 2 })}
            className="rounded-lg border border-line bg-surface px-4 py-3 font-medium text-ink hover:bg-canvas"
          >
            Back to review
          </button>
        )}
        <ScanStatus />
      </div>
    </section>
  );
}
