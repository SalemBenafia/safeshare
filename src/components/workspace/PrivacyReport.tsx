"use client";

import { TYPE_LABELS } from "@/lib/pii/labels";
import { PII_TYPES, type PiiItem } from "@/lib/pii/types";
import type { TaskResult } from "@/lib/tasks/types";

interface Props {
  items: PiiItem[];
  usedAI: boolean;
  result: TaskResult;
}

/** What was protected, where each step ran, and what reached the cloud. */
export function PrivacyReport({ items, usedAI, result }: Props) {
  const enabled = items.filter((i) => i.enabled);
  const keptItems = items.filter((i) => !i.enabled);
  const kept = keptItems.length;
  const keptByType = PII_TYPES.map((type) => [type, keptItems.filter((i) => i.type === type).length] as const)
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${TYPE_LABELS[type]}: ${n}`)
    .join(", ");
  const inCloud = result.source === "IN_CLOUD";
  const sentChars = inCloud ? result.maskedChars : 0;

  const steps = [
    { step: "Privacy scan", where: usedAI ? "On this device (Gemini Nano)" : "On this device (basic scanner)", cloud: false },
    {
      step: "Task",
      where: inCloud ? "In the cloud (Gemini)" : result.source === "ON_DEVICE" ? "On this device (Gemini Nano)" : "Unknown",
      cloud: inCloud,
    },
    { step: "Restoring real values", where: "On this device", cloud: false },
  ];

  return (
    <section aria-labelledby="report-title" className="space-y-4 rounded-xl border border-line bg-surface p-5">
      <h3 id="report-title" className="font-semibold">
        Privacy report
      </h3>

      <p className="rounded-lg bg-device-soft px-3 py-2 text-sm font-semibold text-device">
        {kept === 0
          ? "0 personal items sent"
          : `0 masked items sent · ${kept} ${kept === 1 ? "item" : "items"} you chose to keep visible ${kept === 1 ? "was" : "were"} included (${keptByType})`}
      </p>

      <div>
        <h4 className="mb-1 text-sm font-medium">Items protected</h4>
        {enabled.length === 0 ? (
          <p className="text-sm text-muted">None.</p>
        ) : (
          <ul className="flex flex-wrap gap-2 text-sm">
            {PII_TYPES.map((type) => {
              const n = enabled.filter((i) => i.type === type).length;
              return n === 0 ? null : (
                <li key={type} className="rounded-full bg-canvas px-3 py-1">
                  {TYPE_LABELS[type]}: <strong>{n}</strong>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h4 className="mb-1 text-sm font-medium">Where each step ran</h4>
        <dl className="space-y-1 text-sm">
          {steps.map((s) => (
            <div key={s.step} className="flex justify-between gap-3">
              <dt className="text-muted">{s.step}</dt>
              <dd className={`text-right font-medium ${s.cloud ? "text-cloud" : "text-device"}`}>{s.where}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex justify-between gap-3 border-t border-line pt-3 text-sm">
        <span className="text-muted">Characters sent to the cloud</span>
        <strong>{sentChars.toLocaleString("en")}</strong>
      </div>
    </section>
  );
}
