// Cloud consent, remembered for this browser session only (never in localStorage).
// Only a "yes" is remembered; after "Cancel" we ask again next time.

const KEY = "safeshare.cloudConsent";
let granted = false;

export function hasCloudConsent(): boolean {
  if (granted) return true;
  try {
    return globalThis.sessionStorage?.getItem(KEY) === "granted";
  } catch {
    return false;
  }
}

export function grantCloudConsent(): void {
  granted = true;
  try {
    globalThis.sessionStorage?.setItem(KEY, "granted");
  } catch {
    // Storage blocked: the in-memory flag still covers this page.
  }
}

/** For tests only. */
export function resetCloudConsent(): void {
  granted = false;
  try {
    globalThis.sessionStorage?.removeItem(KEY);
  } catch {
    // ignore
  }
}
