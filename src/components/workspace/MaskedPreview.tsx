"use client";

import { useMemo } from "react";
import { TYPE_LABELS } from "@/lib/pii/labels";
import { leakCheck, mask } from "@/lib/pii/mask";
import type { PiiItem, PiiType } from "@/lib/pii/types";

interface Props {
  text: string;
  items: PiiItem[];
  onAddItem: (value: string, type: PiiType) => void;
}

const PLACEHOLDER = /(\[[A-Z_]+_\d+\])/;

/** Exactly what a cloud model would receive. The placeholder map is never shown or stored. */
export function MaskedPreview({ text, items, onAddItem }: Props) {
  const { masked, report } = useMemo(() => {
    const result = mask(text, items);
    return { masked: result.masked, report: leakCheck(result.masked, items) };
  }, [text, items]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        This is exactly what a cloud model would see. Real values are restored only on your device.
      </p>

      {report.ok ? (
        <p className="rounded-lg bg-device-soft px-3 py-2 text-sm font-medium text-device">
          Leak check passed: no unmasked personal data detected.
        </p>
      ) : (
        <div role="alert" className="rounded-lg border border-warn/40 bg-warn-soft px-3 py-2 text-sm text-warn">
          <p className="font-medium">
            Leak check: {report.leaks.length} possible personal{" "}
            {report.leaks.length === 1 ? "item is" : "items are"} still visible. Cloud tasks will be blocked
            until this is fixed.
          </p>
          <ul className="mt-2 space-y-1">
            {report.leaks.map((leak) => (
              <li key={leak.text} className="flex flex-wrap items-center gap-2">
                <span className="font-mono">{leak.text}</span>
                <span className="text-xs">({TYPE_LABELS[leak.type]})</span>
                <button
                  type="button"
                  onClick={() => onAddItem(leak.text, leak.type)}
                  className="rounded border border-warn/40 bg-surface px-2 py-0.5 text-xs font-medium hover:bg-canvas"
                  aria-label={`Mask ${leak.text}`}
                >
                  Mask it
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        tabIndex={0}
        role="region"
        aria-label="Masked text"
        className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface p-5 font-mono text-[15px] leading-7 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-device"
      >
        {masked.split(PLACEHOLDER).map((part, i) =>
          i % 2 === 1 ? (
            <span key={i} className="rounded-sm bg-cloud-soft px-0.5 font-semibold text-cloud">
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </div>
    </div>
  );
}
