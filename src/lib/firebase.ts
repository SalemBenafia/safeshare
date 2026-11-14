// Browser-only. Lazy singletons for the Firebase app and services (SPEC §5).
import { initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth, signInAnonymously, type Auth, type User } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | undefined;

function assertBrowser(fn: string): void {
  if (typeof window === "undefined") {
    throw new Error(`${fn}() can only run in the browser.`);
  }
}

function isLocalhost(): boolean {
  const host = globalThis.location?.hostname ?? "";
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function readConfig(): FirebaseOptions {
  // Each variable is referenced literally so Next.js can inline it at build time.
  const config: Record<string, string | undefined> = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(
      `Firebase config is missing: ${missing.join(", ")}. Fill in .env.local (see .env.example) and restart the dev server.`,
    );
  }
  return config as FirebaseOptions;
}

/** Returns the single FirebaseApp, initialising it and App Check on first call. */
export function getFirebaseApp(): FirebaseApp {
  assertBrowser("getFirebaseApp");
  if (app) return app;

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (!siteKey) {
    throw new Error(
      "NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY is missing. Fill in .env.local and restart the dev server.",
    );
  }

  const created = initializeApp(readConfig());

  // Development only, and only on localhost. In a production build NODE_ENV is
  // inlined as "production", so this whole block is removed by the compiler.
  // Must be set BEFORE initializeAppCheck; the SDK then prints a debug token in
  // the browser console, to register in Firebase console > App Check.
  if (process.env.NODE_ENV === "development" && isLocalhost()) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(created, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  app = created;
  return app;
}

let db: Firestore | undefined;
let auth: Auth | undefined;

/** Firestore, used only when "Save history" is on. */
export function getDb(): Firestore {
  assertBrowser("getDb");
  db ??= getFirestore(getFirebaseApp());
  return db;
}

/** Auth client. Sign-in happens only through ensureSignedIn(), when history is used. */
export function getAuthClient(): Auth {
  assertBrowser("getAuthClient");
  auth ??= getAuth(getFirebaseApp());
  return auth;
}

/**
 * Returns the current user, signing in anonymously the first time it is needed.
 * Waits for Firebase to restore a previous session first, so the same anonymous
 * user (and their history) is reused on this browser.
 */
export async function ensureSignedIn(): Promise<User> {
  const client = getAuthClient();
  await client.authStateReady();
  return client.currentUser ?? (await signInAnonymously(client)).user;
}
