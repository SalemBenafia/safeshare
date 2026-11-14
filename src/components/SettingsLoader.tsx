"use client";

import { useEffect } from "react";
import { loadSettings } from "@/lib/settings";

/** Starts the Remote Config fetch once on app start. Renders nothing and never blocks. */
export function SettingsLoader() {
  useEffect(() => {
    void loadSettings();
  }, []);
  return null;
}
