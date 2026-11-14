// Splits a document into plain and highlighted segments for the review screen.
import { maskSpans, type MaskSpan } from "./mask";
import { claimLongestFirst, findOccurrences, overlaps } from "./text";
import type { PiiItem } from "./types";

export interface Segment {
  text: string;
  item?: PiiItem;
}

/**
 * Enabled items are placed exactly where mask() will replace them (any case,
 * plus name parts), so the highlights match what is masked. Disabled items fill
 * the gaps. `segments.map(s => s.text).join("") === text`.
 */
export function buildSegments(text: string, items: PiiItem[]): Segment[] {
  const enabled = maskSpans(text, items);

  const seen = new Set<string>();
  const disabledCandidates: MaskSpan[] = [];
  for (const item of items) {
    const key = item.text.toLowerCase();
    if (item.enabled || !item.text || seen.has(key)) continue;
    seen.add(key);
    for (const start of findOccurrences(text, item.text, { ignoreCase: true })) {
      const span = { start, end: start + item.text.length, item };
      if (!enabled.some((e) => overlaps(e, span))) disabledCandidates.push(span);
    }
  }
  const claims = [...enabled, ...claimLongestFirst(disabledCandidates)].sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let last = 0;
  for (const { start, end, item } of claims) {
    if (start > last) segments.push({ text: text.slice(last, start) });
    segments.push({ text: text.slice(start, end), item });
    last = end;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}
