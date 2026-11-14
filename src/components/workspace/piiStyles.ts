import type { PiiType } from "@/lib/pii/types";

// Highlight colours per type. Full literal class names so Tailwind can see them.
// Pale fill + very dark text keeps contrast above 7:1. Green and blue are left out
// because they mean "on-device" and "cloud" elsewhere in the app.
export const TYPE_STYLES: Record<PiiType, { mark: string; chip: string }> = {
  PERSON: { mark: "bg-violet-100 text-violet-950", chip: "bg-violet-500" },
  EMAIL: { mark: "bg-fuchsia-100 text-fuchsia-950", chip: "bg-fuchsia-500" },
  PHONE: { mark: "bg-amber-100 text-amber-950", chip: "bg-amber-500" },
  ID_NUMBER: { mark: "bg-rose-100 text-rose-950", chip: "bg-rose-500" },
  ADDRESS: { mark: "bg-yellow-100 text-yellow-950", chip: "bg-yellow-500" },
  BANK: { mark: "bg-red-100 text-red-950", chip: "bg-red-500" },
  HEALTH: { mark: "bg-pink-100 text-pink-950", chip: "bg-pink-500" },
  DATE_OF_BIRTH: { mark: "bg-indigo-100 text-indigo-950", chip: "bg-indigo-500" },
  OTHER: { mark: "bg-slate-200 text-slate-950", chip: "bg-slate-500" },
};

/** Disabled items: no fill, dashed outline, so they read as "seen but not masked". */
export const DISABLED_MARK =
  "bg-transparent text-ink outline-1 outline-dashed outline-slate-400 -outline-offset-1";
