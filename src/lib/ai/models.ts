// Browser-only. Lazy singletons for every model SafeShare uses (SPEC §5, §6).
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  type AI,
  type GenerativeModel,
} from "firebase/ai";
import { getFirebaseApp } from "../firebase";
import { notImplemented } from "../notImplemented";
import { DEFAULT_SETTINGS } from "../settings";

/** Cloud model name. Will come from Remote Config (`cloud_model`) in a later phase. */
const CLOUD_MODEL = DEFAULT_SETTINGS.cloud_model;

let ai: AI | undefined;
let hybrid: GenerativeModel | undefined;
let cloud: GenerativeModel | undefined;

function getAIInstance(): AI {
  ai ??= getAI(getFirebaseApp(), { backend: new GoogleAIBackend() });
  return ai;
}

/** Privacy scan model. MUST use InferenceMode.ONLY_ON_DEVICE. */
export function scanModel(): GenerativeModel {
  return notImplemented("scanModel");
}

/** Image reading (JPEG/PNG to text). MUST use InferenceMode.ONLY_ON_DEVICE. */
export function imageReadModel(): GenerativeModel {
  return notImplemented("imageReadModel");
}

/** Task model for short work: PREFER_ON_DEVICE. Send masked text only. */
export function hybridModel(): GenerativeModel {
  hybrid ??= getGenerativeModel(getAIInstance(), {
    mode: InferenceMode.PREFER_ON_DEVICE,
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
