// Browser-only. Lazy singletons for the Firebase app and services (SPEC §5).
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { notImplemented } from "./notImplemented";

/** Returns the single FirebaseApp, initialising it (and App Check) on first call. */
export function getFirebaseApp(): FirebaseApp {
  return notImplemented("getFirebaseApp");
}

/** Firestore, used only when "Save history" is on. */
export function getDb(): Firestore {
  return notImplemented("getDb");
}

/** Auth client for anonymous sign-in. */
export function getAuthClient(): Auth {
  return notImplemented("getAuthClient");
}
