import type { LanguageModelCreateOptions } from "firebase/ai";

declare global {
  type LanguageModelAvailability =
    | "available"
    | "downloadable"
    | "downloading"
    | "unavailable";

  /**
   * Chrome's built-in Prompt API (Gemini Nano). Minimal on purpose.
   * UI STATUS ONLY: never use it for inference. All inference goes through
   * Firebase AI Logic (`firebase/ai`). That is why only `availability` is declared.
   */
  var LanguageModel:
    | {
        availability(
          options?: LanguageModelCreateOptions,
        ): Promise<LanguageModelAvailability>;
      }
    | undefined;
}

export {};
