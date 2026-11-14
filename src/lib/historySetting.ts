// "Save history (masked text only)": OFF by default, remembered in localStorage.
// This is only a preference flag; it never contains document data.

const KEY = "safeshare.saveHistory";
const EVENT = "safeshare:save-history";

export function isSaveHistoryOn(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function setSaveHistory(on: boolean): void {
  try {
    if (on) globalThis.localStorage?.setItem(KEY, "true");
    else globalThis.localStorage?.removeItem(KEY);
  } catch {
    // Storage blocked: the setting simply stays off.
  }
  globalThis.dispatchEvent?.(new Event(EVENT));
}

/** For useSyncExternalStore: notified when the setting changes in this tab or another. */
export function subscribeSaveHistory(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) callback();
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
