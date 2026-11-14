"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDeviceStatus, prepareDeviceModel, type DeviceStatus } from "@/lib/ai/device";

export type DeviceUiStatus = DeviceStatus | "checking";

export interface UseDeviceStatus {
  status: DeviceUiStatus;
  /** 0..1 while we track a download; null when unknown. */
  progress: number | null;
  error: string;
  /** Starts (or attaches to) the model download. Bind to a button onClick only. */
  prepare: () => Promise<void>;
  refresh: () => Promise<void>;
}

/** Checks Gemini Nano status on mount and again after a download finishes. */
export function useDeviceStatus(): UseDeviceStatus {
  // "checking" first, so the static HTML and the first client render match.
  const [status, setStatus] = useState<DeviceUiStatus>("checking");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const next = await getDeviceStatus();
    if (mounted.current) setStatus(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const prepare = useCallback(async () => {
    setError("");
    setStatus("downloading");
    setProgress(0);
    try {
      await prepareDeviceModel((p) => {
        if (mounted.current) setProgress(p);
      });
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Could not prepare the model.");
      }
    }
    if (mounted.current) setProgress(null);
    await refresh();
  }, [refresh]);

  return { status, progress, error, prepare, refresh };
}
