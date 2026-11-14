import { itemId, type PiiItem, type PiiOrigin, type PiiType } from "../types";

/** Builds a PiiItem for tests. */
export function item(
  text: string,
  type: PiiType,
  opts: { enabled?: boolean; origin?: PiiOrigin } = {},
): PiiItem {
  return {
    id: itemId(text),
    text,
    type,
    enabled: opts.enabled ?? true,
    origin: opts.origin ?? "user",
  };
}
