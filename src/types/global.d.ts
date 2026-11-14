export {};

declare global {
  /**
   * Firebase App Check debug token. Set to `true` in development (before
   * initializeAppCheck) so the SDK generates and prints a debug token.
   */
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}
