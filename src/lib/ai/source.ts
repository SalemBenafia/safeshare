import type { InferenceSource } from "firebase/ai";
import { notImplemented } from "../notImplemented";

export type Source = "ON_DEVICE" | "IN_CLOUD" | "UNKNOWN";

/** Maps `response.inferenceSource` to the value shown by <SourceBadge>. */
export function toSource(inferenceSource: InferenceSource | undefined): Source {
  void inferenceSource;
  return notImplemented("toSource");
}
