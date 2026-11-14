"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SAMPLES } from "@/lib/samples";
import { useLoadSample } from "./useLoadSample";

/** "Load sample" disclosure. Samples are static files with invented data. */
export function SampleMenu({ disabled }: { disabled?: boolean }) {
  const { load: loadSample, error } = useLoadSample();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    }
  }

  async function load(id: (typeof SAMPLES)[number]["id"]) {
    close();
    await loadSample(id);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-50"
      >
        Load sample
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={open ? "rotate-180" : ""}>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <ul
          id={listId}
          aria-label="Samples with invented data"
          onKeyDown={onListKeyDown}
          className="absolute right-0 z-10 mt-1 w-72 rounded-lg border border-line bg-surface p-1 shadow-lg"
        >
          {SAMPLES.map((s, i) => (
            <li key={s.file}>
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                onClick={() => void load(s.id)}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-canvas focus:bg-canvas"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
