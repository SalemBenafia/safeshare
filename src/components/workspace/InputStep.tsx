"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Skeleton } from "@/components/Skeleton";
import { SAMPLES } from "@/lib/samples";
import { ImageInput } from "./ImageInput";
import { SampleMenu } from "./SampleMenu";
import { ScanStatus } from "./ScanStatus";
import { useLoadSample } from "./useLoadSample";
import { useWorkspace } from "./WorkspaceProvider";

export function InputStep() {
  const { state, dispatch, runScan } = useWorkspace();
  const settings = useSettings();
  const { load, loadingId, error: sampleError } = useLoadSample();
  const empty = !state.text.trim();
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
            Paste text, load a sample, or read a photo. Nothing is uploaded at this step.
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
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !empty && !scanning) {
              e.preventDefault();
              void runScan();
            }
          }}
          readOnly={scanning}
          aria-describedby="doc-count"
          rows={18}
          spellCheck={false}
          placeholder="Paste a CV, a letter, a contract…"
          className="block w-full resize-y rounded-xl border border-line-strong bg-surface p-4 font-mono text-[15px] leading-relaxed text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-device read-only:bg-canvas"
        />
        <p id="doc-count" className="mt-1 text-sm text-muted">
          {chars.toLocaleString("en")} {chars === 1 ? "character" : "characters"}
          {chars > settings.device_max_chars &&
            " · Long document: some tasks may use the cloud later (masked text only)."}
        </p>
      </div>

      {empty && (
        <div className="rounded-xl border border-line bg-surface p-5">
          <h3 className="font-semibold">No document yet</h3>
          <p className="mt-1 text-sm text-muted">
            Try one of our samples (all names and numbers are invented), paste your own text above,
            or read a photo below.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SAMPLES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => void load(sample.id)}
                disabled={loadingId !== null}
                className="rounded-full border border-line-strong bg-surface px-4 py-1.5 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-50"
              >
                {loadingId === sample.id ? "Loading…" : sample.short}
              </button>
            ))}
          </div>
          {sampleError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {sampleError}
            </p>
          )}
        </div>
      )}

      <ImageInput busy={scanning} />

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void runScan()}
          disabled={scanning || empty}
          aria-describedby="scan-hint"
          className="rounded-lg bg-device-fill px-5 py-3 font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {scanning ? "Scanning…" : "Scan for personal data"}
        </button>
        {canReturn && !scanning && (
          <button
            type="button"
            onClick={() => dispatch({ type: "GO_TO_STEP", step: 2 })}
            className="rounded-lg border border-line-strong bg-surface px-4 py-3 font-medium text-ink hover:bg-canvas"
          >
            Back to review
          </button>
        )}
        <ScanStatus />
      </div>
      <p id="scan-hint" className="-mt-2 text-xs text-muted">
        {empty ? "Add some text first." : "Runs on this device. Tip: Ctrl+Enter in the text box also scans."}
      </p>

      {scanning && (
        <div className="rounded-xl border border-line bg-surface p-5">
          <Skeleton lines={5} label="" />
        </div>
      )}
    </section>
  );
}
