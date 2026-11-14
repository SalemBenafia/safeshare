"use client";

import Link from "next/link";
import { useDeviceStatus } from "@/hooks/useDeviceStatus";

const base = "rounded-xl border p-5";

/** Shows whether Gemini Nano can run here, and guides the one-time download. */
export function DeviceStatusCard() {
  const { status, progress, error, prepare } = useDeviceStatus();

  const errorLine = error ? (
    <p className="mt-2 text-sm text-red-700">Could not prepare the model: {error}</p>
  ) : null;

  if (status === "checking") {
    return (
      <div className={`${base} border-line bg-surface`} aria-busy="true">
        <p className="text-sm text-muted">Checking this device for private AI…</p>
      </div>
    );
  }

  if (status === "available") {
    return (
      <div className={`${base} border-device/30 bg-device-soft`} role="status">
        <p className="flex items-center gap-2 font-medium text-device">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-device" />
          Private AI is ready on this device
        </p>
        <p className="mt-1 text-sm text-muted">
          Gemini Nano runs inside Chrome. Your text is scanned here and never uploaded.
        </p>
      </div>
    );
  }

  if (status === "downloadable") {
    return (
      <div className={`${base} border-line bg-surface`}>
        <p className="font-medium">Private AI can run on this device.</p>
        <p className="mt-1 text-sm text-muted">
          Chrome needs to download Gemini Nano once. After that it works offline.
        </p>
        <button
          type="button"
          onClick={() => void prepare()}
          className="mt-3 rounded-lg bg-device px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Download the private AI model (one time, a few GB)
        </button>
        {errorLine}
      </div>
    );
  }

  if (status === "downloading") {
    const pct = progress === null ? null : Math.round(progress * 100);
    return (
      <div className={`${base} border-line bg-surface`} role="status">
        <p className="font-medium">Downloading the private AI model…</p>
        <progress
          value={pct ?? undefined}
          max={100}
          aria-label="Model download progress"
          className="mt-3 h-2 w-full accent-device"
        />
        {pct === null ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>Chrome is downloading the model.</span>
            <button
              type="button"
              onClick={() => void prepare()}
              className="rounded-md border border-line px-3 py-1 text-ink hover:bg-canvas"
            >
              Show progress
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">{pct}%</p>
        )}
        {errorLine}
      </div>
    );
  }

  // unavailable or unsupported
  return (
    <div className={`${base} border-warn/40 bg-warn-soft`} role="status">
      <p className="font-medium text-warn">
        This browser can&apos;t run on-device AI. SafeShare still protects you with a basic
        scanner and always asks before using the cloud.
      </p>
      <Link
        href="/about/#enable-gemini-nano"
        className="mt-2 inline-block text-sm font-medium text-warn underline underline-offset-2"
      >
        How to enable Gemini Nano in Chrome
      </Link>
      {errorLine}
    </div>
  );
}
