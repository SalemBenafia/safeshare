"use client";

import { useState } from "react";
import { TYPE_LABELS } from "@/lib/pii/labels";
import { PII_TYPES, type PiiType } from "@/lib/pii/types";
import { validateNewItem } from "@/lib/workspace/state";
import { useWorkspace } from "./WorkspaceProvider";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function AddItemForm({ value, onChange }: Props) {
  const { state, dispatch } = useWorkspace();
  const [type, setType] = useState<PiiType>("PERSON");
  const [error, setError] = useState("");
  const [added, setAdded] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateNewItem(state.text, value);
    if (problem) {
      setError(problem);
      setAdded("");
      return;
    }
    dispatch({ type: "ADD_ITEM", text: value, itemType: type });
    setAdded(`Added “${value.trim()}” as ${TYPE_LABELS[type].toLowerCase()}.`);
    setError("");
    onChange("");
  }

  return (
    <form onSubmit={submit} aria-labelledby="add-title" className="space-y-2 rounded-xl border border-line bg-surface p-4">
      <h3 id="add-title" className="font-semibold">
        Add item
      </h3>
      <p className="text-sm text-muted">Select text in the document, or type it here exactly as written.</p>
      <div className="space-y-1">
        <label htmlFor="add-text" className="text-sm font-medium">
          Text
        </label>
        <input
          id="add-text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setError("");
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "add-error" : undefined}
          className="block w-full rounded-md border border-line bg-canvas px-3 py-2 font-mono text-sm focus:outline-2 focus:outline-device"
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label htmlFor="add-type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="add-type"
            value={type}
            onChange={(e) => setType(e.target.value as PiiType)}
            className="block w-full rounded-md border border-line bg-canvas px-2 py-2 text-sm focus:outline-2 focus:outline-device"
          >
            {PII_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!value.trim()}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-device disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {error && (
        <p id="add-error" role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <p aria-live="polite" className="text-sm text-device">
        {added}
      </p>
    </form>
  );
}
