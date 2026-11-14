// Routing rules, applied in order (SPEC §6).
import type { DeviceStatus } from "../ai/device";
import { notImplemented } from "../notImplemented";
import type { Settings } from "../settings";
import type { Route, TaskKind, TaskOptions } from "./types";

export interface RouteTask {
  kind: TaskKind;
  options: TaskOptions;
}

/** Picks hybrid or cloud for a task, with a human-readable reason. */
export function pickRoute(
  task: RouteTask,
  maskedText: string,
  settings: Settings,
  deviceStatus: DeviceStatus,
): Route {
  void task;
  void maskedText;
  void settings;
  void deviceStatus;
  return notImplemented("pickRoute");
}
