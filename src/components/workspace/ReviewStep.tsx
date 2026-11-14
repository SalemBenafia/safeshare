"use client";

import { useEffect, useRef, useState } from "react";
import type { PiiType } from "@/lib/pii/types";
import type { ReviewTab } from "@/lib/workspace/state";
import { AddItemForm } from "./AddItemForm";
import { HighlightedText } from "./HighlightedText";
import { ItemList } from "./ItemList";
import { MaskedPreview } from "./MaskedPreview";
import { ScanStatus } from "./ScanStatus";
import { useWorkspace } from "./WorkspaceProvider";

const TABS: { id: ReviewTab; label: string }[] = [
  { id: "highlights", label: "Highlights" },
  { id: "masked", label: "Masked preview" },
];

export function ReviewStep() {
  const { state, dispatch } = useWorkspace();
  const [draft, setDraft] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tabRefs = useRef<Record<ReviewTab, HTMLButtonElement | null>>({ highlights: null, masked: null });

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function selectTab(tab: ReviewTab) {
    dispatch({ type: "SET_TAB", tab });
    tabRefs.current[tab]?.focus();
  }

  function onTabKeyDown(e: React.KeyboardEvent) {
    const i = TABS.findIndex((t) => t.id === state.reviewTab);
    const next =
      e.key === "ArrowRight" ? (i + 1) % TABS.length
      : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? TABS.length - 1
      : -1;
    if (next >= 0) {
      e.preventDefault();
      selectTab(TABS[next].id);
    }
  }

  function addItem(value: string, type: PiiType) {
    dispatch({ type: "ADD_ITEM", text: value, itemType: type });
  }

  return (
    <section aria-labelledby="review-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 id="review-title" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
            2. Review what will be masked
          </h2>
          <ScanStatus />
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "GO_TO_STEP", step: 1 })}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas"
        >
          Edit text
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          <div role="tablist" aria-label="Document view" onKeyDown={onTabKeyDown} className="inline-flex rounded-lg border border-line bg-canvas p-1">
            {TABS.map((t) => {
              const selected = state.reviewTab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  id={`tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(t.id)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-device ${
                    selected ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div id={`panel-${state.reviewTab}`} role="tabpanel" aria-labelledby={`tab-${state.reviewTab}`}>
            {state.reviewTab === "highlights" ? (
              <HighlightedText text={state.text} items={state.items} onSelectText={setDraft} />
            ) : (
              <MaskedPreview text={state.text} items={state.items} onAddItem={addItem} />
            )}
          </div>
        </div>

        <aside aria-label="Review personal data" className="space-y-4">
          <ItemList />
          <AddItemForm value={draft} onChange={setDraft} />
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        <p id="task-hint" className="text-sm text-muted">
          Tasks (summarise, rewrite, translate, ask) arrive in the next phase.
        </p>
        <button
          type="button"
          disabled
          aria-describedby="task-hint"
          className="rounded-lg bg-device px-5 py-2.5 font-medium text-white opacity-50"
        >
          Continue to task
        </button>
      </div>
    </section>
  );
}
