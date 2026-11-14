import { InferenceSource } from "firebase/ai";

export type Source = "ON_DEVICE" | "IN_CLOUD" | "UNKNOWN";

/** Maps `response.inferenceSource` to the value shown by <SourceBadge>. */
export function toSource(inferenceSource: unknown): Source {
  if (inferenceSource === InferenceSource.ON_DEVICE) return "ON_DEVICE";
  if (inferenceSource === InferenceSource.IN_CLOUD) return "IN_CLOUD";
  return "UNKNOWN";
}
