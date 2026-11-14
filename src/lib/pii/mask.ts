// Masking and unmasking (SPEC §3 steps 4 and 7). Runs on-device only.
import { notImplemented } from "../notImplemented";
import type { PiiItem, PlaceholderMap } from "./types";

export interface MaskResult {
  masked: string;
  /** In memory only: never store, log or send it. */
  map: PlaceholderMap;
}

/** Replaces each enabled item with a stable placeholder such as `[PERSON_1]`. */
export function mask(text: string, items: PiiItem[]): MaskResult {
  void text;
  void items;
  return notImplemented("mask");
}

/** Restores real values in a model answer, on the device. */
export function unmask(text: string, map: PlaceholderMap): string {
  void text;
  void map;
  return notImplemented("unmask");
}

export interface LeakReport {
  ok: boolean;
  /** Types found, never the values themselves. */
  leakedTypes: string[];
}

/** Must pass before any hybrid or cloud call; if `ok` is false, block the call. */
export function leakCheck(masked: string, items: PiiItem[]): LeakReport {
  void masked;
  void items;
  return notImplemented("leakCheck");
}
