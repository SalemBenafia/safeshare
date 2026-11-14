"use client";

import { useSyncExternalStore } from "react";
import { SourceBadge } from "@/components/SourceBadge";
import { useDeviceStatus } from "@/hooks/useDeviceStatus";
import { useSettingsState } from "@/hooks/useSettings";
import { getLastAnswer, subscribeLastAnswer } from "@/lib/diagnostics";
import { SETTING_KEYS } from "@/lib/settings";

const DEVICE_LABELS = {
  checking: "Checking…",
  available: "Available (Gemini Nano ready)",
  downloadable: "Downloadable (model not downloaded yet)",
  downloading: "Downloading",
  unavailable: "Unavailable on this device",
  unsupported: "Not supported in this browser",
} as const;

const LOAD_LABELS = {
  defaults: "In-app defaults (Remote Config not loaded yet)",
  loading: "Loading Remote Config…",
  loaded: "Remote Config loaded",
  failed: "Remote Config unavailable: using in-app defaults",
} as const;

/** Active settings, device status and the source of the last answer. */
export function Diagnostics() {
  const settings = useSettingsState();
  const { status } = useDeviceStatus();
  const last = useSyncExternalStore(subscribeLastAnswer, getLastAnswer, () => null);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 font-medium">Active settings</h3>
        <p className="mb-2 text-sm text-muted" role="status">
          {LOAD_LABELS[settings.status]}
        </p>
        <table className="w-full max-w-2xl text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th scope="col" className="py-1.5 pr-4 font-medium">Setting</th>
              <th scope="col" className="py-1.5 pr-4 font-medium">Value</th>
              <th scope="col" className="py-1.5 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {SETTING_KEYS.map((key) => (
              <tr key={key} className="border-b border-line last:border-0">
                <th scope="row" className="py-1.5 pr-4 text-left font-mono font-normal">{key}</th>
                <td className="py-1.5 pr-4 font-mono">{String(settings.values[key])}</td>
                <td className="py-1.5 text-muted">
                  {settings.sources[key] === "remote" ? "Remote Config" : "In-app default"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="grid max-w-2xl gap-3 text-sm sm:grid-cols-[12rem_1fr]">
        <dt className="font-medium">Device status</dt>
        <dd>
          <span className="font-mono">{status}</span>
          <span className="text-muted"> · {DEVICE_LABELS[status]}</span>
        </dd>
        <dt className="font-medium">Last answer</dt>
        <dd>
          {last ? (
            <span className="flex flex-wrap items-center gap-2">
              <SourceBadge source={last.source} reason={last.reason} />
              <span className="text-muted">
                {last.reason} · {new Date(last.at).toLocaleTimeString("en-GB")}
              </span>
            </span>
          ) : (
            <span className="text-muted">No task has run in this session yet.</span>
          )}
        </dd>
      </dl>
    </div>
  );
}
