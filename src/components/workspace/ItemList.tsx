"use client";

import { ORIGIN_LABELS, TYPE_LABELS } from "@/lib/pii/labels";
import { PII_TYPES, type PiiItem } from "@/lib/pii/types";
import { TYPE_STYLES } from "./piiStyles";
import { useWorkspace } from "./WorkspaceProvider";

function Toggle({ item }: { item: PiiItem }) {
  const { dispatch } = useWorkspace();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={item.enabled}
      aria-label={`Mask ${item.text} (${TYPE_LABELS[item.type]})`}
      onClick={() => dispatch({ type: "TOGGLE_ITEM", id: item.id })}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-device ${
        item.enabled ? "bg-device-fill" : "bg-slate-500"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
          item.enabled ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function ItemList() {
  const { state, dispatch } = useWorkspace();
  const { items } = state;
  const enabled = items.filter((i) => i.enabled).length;

  return (
    <section aria-labelledby="items-title" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="items-title" className="font-semibold">
          Personal data found
        </h3>
        <p className="text-sm text-muted">
          {enabled} of {items.length} will be masked
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">
          No personal data found. Select text in the document, or use the form below, to add items.
        </p>
      ) : (
        <div className="max-h-[50vh] space-y-4 overflow-auto pr-1">
          {PII_TYPES.map((type) => {
            const group = items.filter((i) => i.type === type);
            if (group.length === 0) return null;
            const headingId = `group-${type}`;
            const allMasked = group.every((i) => i.enabled);
            const label = TYPE_LABELS[type];
            return (
              <div key={type} role="group" aria-labelledby={headingId}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h4 id={headingId} className="flex items-center gap-2 text-sm font-medium text-ink">
                    <span aria-hidden="true" className={`size-2.5 rounded-full ${TYPE_STYLES[type].chip}`} />
                    {label}
                    <span className="text-muted">({group.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "SET_TYPE_ENABLED", itemType: type, enabled: !allMasked })}
                    aria-label={
                      allMasked
                        ? `Show all ${group.length} ${label} to the AI (do not mask)`
                        : `Mask all ${group.length} ${label}`
                    }
                    className="rounded px-2 py-0.5 text-xs font-medium text-muted hover:bg-line hover:text-ink focus-visible:outline-2 focus-visible:outline-device"
                  >
                    {allMasked ? "Show all" : "Hide all"}
                  </button>
                </div>
                <ul className="space-y-1">
                  {group.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-canvas">
                      <Toggle item={item} />
                      <span
                        title={item.text}
                        className={`min-w-0 flex-1 truncate font-mono text-sm ${item.enabled ? "text-ink" : "text-muted line-through"}`}
                      >
                        {item.text}
                      </span>
                      <span className="shrink-0 rounded bg-canvas px-1.5 py-0.5 text-xs text-muted">
                        {ORIGIN_LABELS[item.origin]}
                      </span>
                      {item.origin === "user" && (
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "REMOVE_ITEM", id: item.id })}
                          aria-label={`Remove ${item.text}`}
                          className="shrink-0 rounded px-1.5 text-muted hover:bg-line hover:text-ink focus-visible:outline-2 focus-visible:outline-device"
                        >
                          <span aria-hidden="true">×</span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
