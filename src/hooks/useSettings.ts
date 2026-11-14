"use client";

import { useSyncExternalStore } from "react";
import {
  getServerSettingsState,
  getSettingsState,
  subscribeSettings,
  type Settings,
  type SettingsState,
} from "@/lib/settings";

/** Active settings plus where each value came from. Defaults until Remote Config loads. */
export function useSettingsState(): SettingsState {
  return useSyncExternalStore(subscribeSettings, getSettingsState, getServerSettingsState);
}

export function useSettings(): Readonly<Settings> {
  return useSettingsState().values;
}
