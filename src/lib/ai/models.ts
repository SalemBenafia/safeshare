// Browser-only. Lazy singletons for every model SafeShare uses (SPEC §5, §6).
import type { GenerativeModel } from "firebase/ai";
import { notImplemented } from "../notImplemented";

/** Privacy scan model. MUST use InferenceMode.ONLY_ON_DEVICE. */
export function scanModel(): GenerativeModel {
  return notImplemented("scanModel");
}

/** Image reading (JPEG/PNG to text). MUST use InferenceMode.ONLY_ON_DEVICE. */
export function imageReadModel(): GenerativeModel {
  return notImplemented("imageReadModel");
}

/** Task model for short work: InferenceMode.PREFER_ON_DEVICE. Masked text only. */
export function hybridModel(): GenerativeModel {
  return notImplemented("hybridModel");
}

/** Task model for cloud work: InferenceMode.ONLY_IN_CLOUD. Masked text only. */
export function cloudModel(): GenerativeModel {
  return notImplemented("cloudModel");
}
