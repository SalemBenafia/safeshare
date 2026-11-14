"use client";

import { useEffect, useState } from "react";
import { PlaceholderText } from "@/components/PlaceholderText";
import { SaveHistoryToggle, useSaveHistory } from "@/components/SaveHistoryToggle";
import { SourceBadge } from "@/components/SourceBadge";
import { useSettings } from "@/hooks/useSettings";
import { clearAll, computeStats, deleteResult, listResults, type HistoryEntry } from "@/lib/history";
import { TYPE_LABELS } from "@/lib/pii/labels";
import { PII_TYPES } from "@/lib/pii/types";
import { friendlyError } from "@/lib/tasks/errors";
import type { TaskKind } from "@/lib/tasks/types";

const TASK_LABELS: Record<TaskKind, string> = {
  summarise: "Summary",
  rewrite: "Rewrite",
  translate: "Translation",
  ask: "Question",
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; entries: HistoryEntry[] }
  | { status: "error"; message: string };

function formatDate(d: Date): string {
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function EntryCard({ entry, onDelete }: { entry: HistoryEntry; onDelete: (e: HistoryEntry) => void }) {
  const counts = PII_TYPES.filter((t) => entry.itemCounts[t]);
  const when = formatDate(entry.createdAt);
  return (
    <li className="space-y-3 rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold">{TASK_LABELS[entry.task]}</h3>
        <time dateTime={entry.createdAt.toISOString()} className="text-sm text-muted">
          {when}
        </time>
        <SourceBadge source={entry.source} reason={entry.reason} />
        <button
          type="button"
          onClick={() => onDelete(entry)}
          aria-label={`Delete the ${TASK_LABELS[entry.task].toLowerCase()} from ${when}`}
          className="ml-auto rounded-md border border-line px-3 py-1 text-sm text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-device"
        >
          Delete
        </button>
      </div>
      {counts.length > 0 && (
        <ul aria-label="Items protected" className="flex flex-wrap gap-2 text-sm">
          {counts.map((t) => (
            <li key={t} className="rounded-full bg-canvas px-3 py-1">
              {TYPE_LABELS[t]}: <strong>{entry.itemCounts[t]}</strong>
            </li>
          ))}
        </ul>
      )}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-cloud">View masked text</summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {[
            ["Masked document", entry.maskedInput],
            ["Masked answer", entry.maskedOutput],
          ].map(([label, text]) => (
            <div key={label}>
              <h4 className="mb-1 text-sm font-medium">{label}</h4>
              <div
                tabIndex={0}
                role="region"
                aria-label={label}
                dir="auto"
                className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-canvas p-3 font-mono text-sm leading-6 focus-visible:outline-2 focus-visible:outline-device"
              >
                <PlaceholderText text={text} />
              </div>
            </div>
          ))}
        </div>
      </details>
    </li>
  );
}

function HistoryList() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch from Firestore (an external system); state is only set in the callbacks.
  useEffect(() => {
    let cancelled = false;
    listResults().then(
      (entries) => {
        if (!cancelled) setLoad({ status: "ready", entries });
      },
      (err: unknown) => {
        if (!cancelled) setLoad({ status: "error", message: friendlyError(err).message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setLoad({ status: "loading" });
    setReloadKey((k) => k + 1);
  }

  async function remove(entry: HistoryEntry) {
    if (!window.confirm("Delete this saved result?")) return;
    try {
      await deleteResult(entry.id);
      setLoad((l) => (l.status === "ready" ? { ...l, entries: l.entries.filter((e) => e.id !== entry.id) } : l));
      setNotice("Deleted.");
    } catch (err) {
      setNotice(friendlyError(err).message);
    }
  }

  async function removeAll() {
    if (!window.confirm("Delete all saved results? This cannot be undone.")) return;
    try {
      const n = await clearAll();
      setLoad({ status: "ready", entries: [] });
      setNotice(`Deleted ${n} saved ${n === 1 ? "result" : "results"}.`);
    } catch (err) {
      setNotice(friendlyError(err).message);
    }
  }

  if (load.status === "loading") {
    return <p className="text-sm text-muted" aria-busy="true">Loading your saved results…</p>;
  }
  if (load.status === "error") {
    return (
      <div role="alert" className="space-y-2 rounded-xl border border-warn/40 bg-warn-soft p-4 text-sm text-warn">
        <p>{load.message}</p>
        <button type="button" onClick={retry} className="rounded border border-warn/40 bg-surface px-3 py-1 text-ink">
          Try again
        </button>
      </div>
    );
  }

  const { total, onDevicePct } = computeStats(load.entries);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium">
          {total} {total === 1 ? "task" : "tasks"}, {onDevicePct}% on-device
        </p>
        {total > 0 && (
          <button
            type="button"
            onClick={() => void removeAll()}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-device"
          >
            Delete all
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className="text-sm text-muted">
        {notice}
      </p>
      {total === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
          No saved results yet. Run a task in the workspace while history is on.
        </p>
      ) : (
        <ul className="space-y-4">
          {load.entries.map((e) => (
            <EntryCard key={e.id} entry={e} onDelete={(x) => void remove(x)} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function HistoryView() {
  const on = useSaveHistory();
  const { history_enabled: historyEnabled } = useSettings();
  if (!historyEnabled) {
    return (
      <section aria-labelledby="history-title" className="space-y-4">
        <h1 id="history-title" className="text-3xl font-semibold tracking-tight">
          History
        </h1>
        <p className="max-w-2xl rounded-xl border border-dashed border-line p-5 text-sm text-muted">
          History is not available right now. Nothing is saved or loaded.
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="history-title" className="space-y-6">
      <div className="space-y-2">
        <h1 id="history-title" className="text-3xl font-semibold tracking-tight">
          History
        </h1>
        <p className="max-w-2xl text-muted">
          Saved results contain masked text only: every name, number and date is a placeholder.
        </p>
      </div>
      <div className="rounded-xl border border-line bg-surface p-4">
        <SaveHistoryToggle />
      </div>
      {on ? (
        <HistoryList />
      ) : (
        <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
          History is off, so nothing is saved and nothing is loaded. Turn it on above to keep the
          masked version of your next results.
        </p>
      )}
    </section>
  );
}
