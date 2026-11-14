// Turns SDK, network and privacy errors into calm, actionable messages.
import { LeakError } from "./leak-error";

export type ErrorKind =
  | "leak"
  | "offline"
  | "quota"
  | "appcheck"
  | "setup"
  | "device"
  | "config"
  | "unknown";

export interface FriendlyError {
  kind: ErrorKind;
  title: string;
  message: string;
}

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  customErrorData?: { status?: unknown };
}

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function friendlyError(err: unknown, online: boolean = isOnline()): FriendlyError {
  if (err instanceof LeakError) {
    const n = err.leaks.length;
    return {
      kind: "leak",
      title: "Blocked before sending",
      message: `${n} personal ${n === 1 ? "item is" : "items are"} still visible in the text that would be sent. Nothing was sent. Go back to Review and mask ${n === 1 ? "it" : "them"}.`,
    };
  }

  const e = (typeof err === "object" && err !== null ? err : {}) as ErrorLike;
  const code = typeof e.code === "string" ? e.code : "";
  const message = typeof e.message === "string" ? e.message : String(err ?? "");
  const status = typeof e.customErrorData?.status === "number" ? e.customErrorData.status : undefined;

  if (message.startsWith("Firebase config is missing") || message.includes("RECAPTCHA_ENTERPRISE_SITE_KEY")) {
    return {
      kind: "config",
      title: "SafeShare is not configured yet",
      message: "The Firebase settings are missing. Fill in .env.local (see .env.example) and restart the app.",
    };
  }
  if (!online || (code === "fetch-error" && status === undefined) || /failed to fetch|networkerror|network request failed/i.test(message)) {
    return {
      kind: "offline",
      title: "You seem to be offline",
      message: "Cloud tasks need an internet connection. On-device scanning and short on-device tasks still work.",
    };
  }
  if (status === 429 || /quota|resource[_ ]exhausted|rate limit/i.test(message)) {
    return {
      kind: "quota",
      title: "The cloud AI is busy",
      message: "The usage limit was reached for now. Wait a minute and try again, or use a shorter text so the task can run on your device.",
    };
  }
  if (/app.?check|attestation/i.test(message) || code.startsWith("appCheck/") || status === 401 || status === 403) {
    return {
      kind: "appcheck",
      title: "SafeShare could not verify this app",
      message: "App Check rejected the request. Reload the page and try again. In development, register the App Check debug token in the Firebase console.",
    };
  }
  // Checked before "setup": the SDK reports this with code "api-not-enabled" too.
  if (/LanguageModel API not available|on-device model/i.test(message)) {
    return {
      kind: "device",
      title: "On-device AI is not available",
      message: "Gemini Nano is not ready in this browser. See About → Enable Gemini Nano in Chrome.",
    };
  }
  if (code === "api-not-enabled" || status === 404) {
    return {
      kind: "setup",
      title: "The cloud model is not available",
      message: "Firebase AI Logic is not enabled for this project, or the model name is wrong. Check the Firebase console.",
    };
  }
  return {
    kind: "unknown",
    title: "Something went wrong",
    message: "The task could not be completed. Nothing was saved. Please try again.",
  };
}
