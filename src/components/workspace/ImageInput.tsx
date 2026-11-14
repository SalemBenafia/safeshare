"use client";

import { useRef, useState } from "react";
import { useDeviceStatus } from "@/hooks/useDeviceStatus";
import { ImageReadError, readImageText, validateImageFile } from "@/lib/image/read";
import { useWorkspace } from "./WorkspaceProvider";

const UNAVAILABLE =
  "Reading images needs on-device AI, so your document photo never leaves your computer.";

interface Message {
  kind: "error" | "ok";
  text: string;
}

/** Drag and drop or pick a JPEG/PNG; its text is read by Gemini Nano on this device only. */
export function ImageInput({ busy }: { busy: boolean }) {
  const { state, dispatch } = useWorkspace();
  const { status } = useDeviceStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const available = status === "available";
  const disabled = !available || busy || reading;

  async function handle(file: File | undefined) {
    if (!file || disabled) return;
    const problem = validateImageFile(file);
    if (problem) {
      setMessage({ kind: "error", text: problem });
      return;
    }
    if (state.text.trim() && !window.confirm("Replace your current text with the text from the image?")) return;

    setReading(true);
    setMessage(null);
    try {
      const text = await readImageText(file);
      dispatch({ type: "SET_TEXT", text });
      setMessage({ kind: "ok", text: "Text read on your device. The image was not uploaded or kept. Check it, then scan." });
    } catch (err) {
      setMessage({
        kind: "error",
        text:
          err instanceof ImageReadError
            ? err.message
            : "Could not read the image on this device. Try a sharper photo, or paste the text instead.",
      });
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = ""; // release the file
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault(); // never let the browser open the image
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void handle(e.dataTransfer.files[0]);
      }}
      aria-busy={reading}
      className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
        disabled && !reading
          ? "border-line bg-canvas"
          : dragOver
            ? "border-device bg-device-soft"
            : "border-line bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          aria-describedby="image-hint"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-device disabled:opacity-50"
        >
          {reading ? "Reading on your device…" : "Choose a photo"}
        </button>
        <p id="image-hint" className="text-sm text-muted">
          {status === "checking"
            ? "Checking on-device AI…"
            : available
              ? "…or drop a photo or screenshot of a document here. JPEG or PNG, up to 5 MB. Read on this device only."
              : UNAVAILABLE}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          hidden
          onChange={(e) => void handle(e.target.files?.[0])}
        />
      </div>
      <p
        role={message?.kind === "error" ? "alert" : "status"}
        aria-live="polite"
        className={`text-sm ${message ? "mt-2" : ""} ${message?.kind === "error" ? "text-danger" : "text-device"}`}
      >
        {message?.text}
      </p>
    </div>
  );
}
