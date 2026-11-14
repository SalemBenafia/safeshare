"use client";

import { useWorkspace } from "./WorkspaceProvider";

/** Live status of the on-device scan. Always reassures that nothing left the device. */
export function ScanStatus() {
  const { state } = useWorkspace();
  const { scan, items } = state;

  let message: React.ReactNode = null;
  let tone = "text-muted";

  if (scan.status === "scanning") {
    message = (
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-3 animate-spin rounded-full border-2 border-device border-t-transparent"
        />
        Scanning on your device…
      </span>
    );
  } else if (scan.status === "done") {
    const n = items.length;
    const found = `Found ${n} ${n === 1 ? "item" : "items"}`;
    tone = "text-device";
    message = scan.usedAI
      ? `${found}. Scanned on-device. Nothing left your computer.`
      : `${found} with the basic scanner. Nothing left your computer.`;
  } else if (scan.status === "error") {
    tone = "text-red-700";
    message = `The scan failed: ${scan.error}`;
  }

  return (
    <div role="status" aria-live="polite" className={`text-sm font-medium ${tone}`}>
      {message}
      {scan.status === "done" && scan.failedChunks > 0 && (
        <p className="mt-1 font-normal text-warn">
          {scan.failedChunks} part{scan.failedChunks === 1 ? "" : "s"} of the document could not be
          read by the AI; the basic scanner still checked {scan.failedChunks === 1 ? "it" : "them"}.
          Please review carefully.
        </p>
      )}
    </div>
  );
}
