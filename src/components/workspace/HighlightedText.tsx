"use client";

import { Fragment, useMemo, useRef } from "react";
import { TYPE_LABELS } from "@/lib/pii/labels";
import { buildSegments } from "@/lib/pii/segments";
import type { PiiItem } from "@/lib/pii/types";
import { DISABLED_MARK, TYPE_STYLES } from "./piiStyles";

interface Props {
  text: string;
  items: PiiItem[];
  /** Called with the selected text when the user selects inside the document. */
  onSelectText: (value: string) => void;
}

export function HighlightedText({ text, items, onSelectText }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const segments = useMemo(() => buildSegments(text, items), [text, items]);

  function readSelection() {
    const sel = window.getSelection();
    const root = ref.current;
    if (!sel || sel.isCollapsed || !root) return;
    if (!root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return;
    const value = sel.toString().trim();
    if (value.length >= 2 && value.length <= 300) onSelectText(value);
  }

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="region"
      aria-label="Document with highlighted personal data. Select text to add an item."
      onMouseUp={readSelection}
      onKeyUp={readSelection}
      className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface p-5 font-mono text-[15px] leading-7 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-device"
    >
      {segments.map((seg, i) =>
        seg.item ? (
          <mark
            key={i}
            data-type={seg.item.type}
            title={`${TYPE_LABELS[seg.item.type]}${seg.item.enabled ? "" : " (will not be masked)"}`}
            className={`rounded-sm px-0.5 ${seg.item.enabled ? TYPE_STYLES[seg.item.type].mark : DISABLED_MARK}`}
          >
            {seg.text}
          </mark>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </div>
  );
}
