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
import { PII_TYPES } from "../pii/types";
import { getSettings } from "../settings";

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
let imageRead: GenerativeModel | undefined;
/** Task models are tied to a cloud model name (Remote Config `cloud_model`). */
let hybrid: { model: GenerativeModel; cloudModel: string } | undefined;
let cloud: { model: GenerativeModel; cloudModel: string } | undefined;

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

/**
 * Image reading (JPEG/PNG to text). ONLY_ON_DEVICE: the photo never leaves the device.
 * The Prompt API only accepts images when the session declares an image input,
 * which DEVICE_CREATE_OPTIONS does ({ type: "image" } in expectedInputs).
 * NEVER change this to a cloud-capable mode.
 */
export function imageReadModel(): GenerativeModel {
  imageRead ??= getGenerativeModel(getAIInstance(), {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: { createOptions: DEVICE_CREATE_OPTIONS },
  });
  return imageRead;
}

/**
 * Task model for short work: PREFER_ON_DEVICE. Send masked text only.
 * Recreated if Remote Config changes `cloud_model`.
 */
export function hybridModel(): GenerativeModel {
  const name = getSettings().cloud_model;
  if (hybrid?.cloudModel !== name) {
    hybrid = {
      cloudModel: name,
      model: getGenerativeModel(getAIInstance(), {
        mode: InferenceMode.PREFER_ON_DEVICE,
        onDeviceParams: { createOptions: DEVICE_CREATE_OPTIONS },
        inCloudParams: { model: name },
      }),
    };
  }
  return hybrid.model;
}

/**
 * Task model for cloud work: ONLY_IN_CLOUD. Send masked text only.
 * Recreated if Remote Config changes `cloud_model`.
 */
export function cloudModel(): GenerativeModel {
  const name = getSettings().cloud_model;
  if (cloud?.cloudModel !== name) {
    cloud = {
      cloudModel: name,
      model: getGenerativeModel(getAIInstance(), {
        mode: InferenceMode.ONLY_IN_CLOUD,
        inCloudParams: { model: name },
      }),
    };
  }
  return cloud.model;
}
