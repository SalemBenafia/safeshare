// Browser-only. Lazy singletons for every model SafeShare uses (SPEC §5, §6).
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  Schema,
  type AI,
  type GenerativeModel,
  type LanguageModelCreateOptions,
} from "firebase/ai";
import { getFirebaseApp } from "../firebase";
import { notImplemented } from "../notImplemented";
import { PII_TYPES } from "../pii/types";
import { DEFAULT_SETTINGS } from "../settings";

/** Cloud model name. Will come from Remote Config (`cloud_model`) in a later phase. */
const CLOUD_MODEL = DEFAULT_SETTINGS.cloud_model;

/**
 * Expected inputs/outputs for Gemini Nano (same as the Firebase SDK defaults:
 * English text in, plus images; English text out). Shared by every on-device
 * model AND by getDeviceStatus(), so the status shown matches what we run.
 */
export const DEVICE_CREATE_OPTIONS: LanguageModelCreateOptions = {
  expectedInputs: [{ type: "text", languages: ["en"] }, { type: "image" }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

/** Structured output for the privacy scan: { items: [{ text, type }] }. */
export const PII_SCAN_SCHEMA = Schema.object({
  properties: {
    items: Schema.array({
      items: Schema.object({
        properties: {
          text: Schema.string(),
          type: Schema.enumString({ enum: [...PII_TYPES] }),
        },
      }),
    }),
  },
});

let ai: AI | undefined;
let scan: GenerativeModel | undefined;
let hybrid: GenerativeModel | undefined;
let cloud: GenerativeModel | undefined;

function getAIInstance(): AI {
  ai ??= getAI(getFirebaseApp(), { backend: new GoogleAIBackend() });
  return ai;
}

/**
 * Privacy scan model. ONLY_ON_DEVICE: raw text never leaves the device.
 * NEVER change this to a cloud-capable mode.
 */
export function scanModel(): GenerativeModel {
  scan ??= getGenerativeModel(getAIInstance(), {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: DEVICE_CREATE_OPTIONS,
      promptOptions: { responseConstraint: PII_SCAN_SCHEMA },
    },
  });
  return scan;
}

/** Image reading (JPEG/PNG to text). MUST use InferenceMode.ONLY_ON_DEVICE. */
export function imageReadModel(): GenerativeModel {
  return notImplemented("imageReadModel");
}

/** Task model for short work: PREFER_ON_DEVICE. Send masked text only. */
export function hybridModel(): GenerativeModel {
  hybrid ??= getGenerativeModel(getAIInstance(), {
    mode: InferenceMode.PREFER_ON_DEVICE,
    onDeviceParams: { createOptions: DEVICE_CREATE_OPTIONS },
    inCloudParams: { model: CLOUD_MODEL },
  });
  return hybrid;
}

/** Task model for cloud work: ONLY_IN_CLOUD. Send masked text only. */
export function cloudModel(): GenerativeModel {
  cloud ??= getGenerativeModel(getAIInstance(), {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: { model: CLOUD_MODEL },
  });
  return cloud;
}
