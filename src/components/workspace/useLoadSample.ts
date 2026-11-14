"use client";

import { useCallback, useState } from "react";
import { sampleUrl, type SampleId } from "@/lib/samples";
import { useWorkspace } from "./WorkspaceProvider";

/** Texts that came from samples, so replacing them does not need a confirmation. */
const loadedSampleTexts = new Set<string>();

/** Loads a built-in sample into the workspace, asking before replacing the user's own text. */
export function useLoadSample() {
  const { state, dispatch } = useWorkspace();
  const [loadingId, setLoadingId] = useState<SampleId | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(
    async (id: SampleId): Promise<boolean> => {
      setError("");
      const ownText = state.text.trim() !== "" && !loadedSampleTexts.has(state.text);
      if (ownText && !window.confirm("Replace your current text with the sample?")) return false;
      setLoadingId(id);
      try {
        const res = await fetch(sampleUrl(id));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        loadedSampleTexts.add(text);
        dispatch({ type: "SET_TEXT", text });
        return true;
      } catch {
        setError("Could not load the sample. Check your connection and try again.");
        return false;
      } finally {
        setLoadingId(null);
      }
    },
    [state.text, dispatch],
  );

  return { load, loadingId, error };
}
