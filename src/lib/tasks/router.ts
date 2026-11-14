// Routing rules, applied in order (SPEC §6). Rule 1 (scan + image reading are
// ONLY_ON_DEVICE) is enforced in scanModel()/imageReadModel(), not here.
import type { DeviceStatus } from "../ai/device";
import type { Settings } from "../settings";
import { LANGUAGE_NAMES } from "./prompts";
import type { Route, TaskKind, TaskOptions } from "./types";

export interface RouteTask {
  kind: TaskKind;
  options: TaskOptions;
}

/** Picks hybrid (prefer on-device) or cloud for a task, with a human-readable reason. */
export function pickRoute(
  task: RouteTask,
  maskedText: string,
  settings: Pick<Settings, "device_max_chars">,
  deviceStatus: DeviceStatus,
): Route {
  // Rule 2: translation into French or Arabic -> cloud (masked text only).
  const lang = task.options.language;
  if (task.kind === "translate" && (lang === "fr" || lang === "ar")) {
    return { target: "cloud", reason: `Translation into ${LANGUAGE_NAMES[lang]} → cloud` };
  }
  // Rule 3: masked text longer than device_max_chars -> cloud.
  if (maskedText.length > settings.device_max_chars) {
    const n = maskedText.length.toLocaleString("en");
    return { target: "cloud", reason: `Long document (${n} characters) → cloud` };
  }
  // Rule 4: device model not available -> cloud (after consent).
  if (deviceStatus !== "available") {
    return { target: "cloud", reason: "On-device AI not available → cloud" };
  }
  // Rule 5: otherwise hybrid (PREFER_ON_DEVICE).
  return { target: "hybrid", reason: "Short task → on-device" };
}
