"use client";

// DEVELOPMENT ONLY. Sends the textarea text as-is to test hybrid routing.
// TODO(phase: mask): the real workspace must run mask() + leakCheck() before any call.

import { useState } from "react";
import { prepareDeviceModel } from "@/lib/ai/device";
import { cloudModel, hybridModel } from "@/lib/ai/models";
import { toSource, type Source } from "@/lib/ai/source";
import { SourceBadge } from "@/components/SourceBadge";

type Mode = "device" | "cloud";
type PrepState = "idle" | "preparing" | "ready" | "error";

const SAMPLE =
  "Summarise in two sentences: Alex Testperson, a fictional nurse, moved from Sampletown to Exampleville and now leads a small night-shift team.";

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Unexpected error.";
}

export function Playground() {
  const [prep, setPrep] = useState<PrepState>("idle");
  const [progress, setProgress] = useState(0);
  const [prepError, setPrepError] = useState("");

  const [prompt, setPrompt] = useState(SAMPLE);
  const [busy, setBusy] = useState<Mode | null>(null);
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState<Source | null>(null);
  const [error, setError] = useState("");

  async function prepare() {
    setPrep("preparing");
    setPrepError("");
    setProgress(0);
    try {
      // Must run from a user click (Chrome requires a user gesture to download).
      await prepareDeviceModel((p) => setProgress(p));
      setProgress(1);
      setPrep("ready");
    } catch (err) {
      setPrepError(messageOf(err));
      setPrep("error");
    }
  }

  async function ask(mode: Mode) {
    setBusy(mode);
    setAnswer("");
    setSource(null);
    setError("");
    try {
      const model = mode === "device" ? hybridModel() : cloudModel();
      const result = await model.generateContentStream(prompt);
      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.text();
        setAnswer(text);
      }
      const final = await result.response;
      setSource(toSource(final.inferenceSource));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Playground</h1>
        <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-ink">
          Dev only: this text is sent as-is, without masking. Use invented data only.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-semibold">1. On-device model</h2>
        <button
          type="button"
          onClick={prepare}
          disabled={prep === "preparing"}
          className="rounded-lg bg-device-fill px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {prep === "preparing" ? "Preparing…" : "Prepare on-device AI"}
        </button>
        {prep !== "idle" && (
          <div className="space-y-1">
            <progress
              value={progress}
              max={1}
              aria-label="On-device model download"
              className="h-2 w-full max-w-md accent-device"
            />
            <p className="text-sm text-muted">
              {prep === "preparing" && `Downloading… ${Math.round(progress * 100)}%`}
              {prep === "ready" && "Gemini Nano is ready."}
              {prep === "error" && `Could not prepare: ${prepError}`}
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-semibold">2. Ask</h2>
        <label htmlFor="pg-prompt" className="sr-only">
          Prompt
        </label>
        <textarea
          id="pg-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-line-strong bg-canvas p-3 text-sm focus:outline-2 focus:outline-device"
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => ask("device")}
            disabled={busy !== null || !prompt.trim()}
            className="rounded-lg bg-device-fill px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy === "device" ? "Asking…" : "Ask (prefer device)"}
          </button>
          <button
            type="button"
            onClick={() => ask("cloud")}
            disabled={busy !== null || !prompt.trim()}
            className="rounded-lg bg-cloud-fill px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy === "cloud" ? "Asking…" : "Ask (cloud only)"}
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-line bg-surface p-5" aria-live="polite">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">3. Answer</h2>
          {source && <SourceBadge source={source} />}
        </div>
        {error ? (
          <p className="text-sm text-danger">Error: {error}</p>
        ) : (
          <p className="min-h-12 whitespace-pre-wrap text-sm">
            {answer || <span className="text-muted">No answer yet.</span>}
          </p>
        )}
      </section>
    </div>
  );
}
