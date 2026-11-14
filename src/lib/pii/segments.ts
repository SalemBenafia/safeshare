// Splits a document into plain and highlighted segments for the review screen.
import { claimLongestFirst, findOccurrences, overlaps } from "./text";
import type { PiiItem } from "./types";

export interface Segment {
  text: string;
  item?: PiiItem;
}

interface Claim {
  start: number;
  end: number;
  item: PiiItem;
}

function spansFor(text: string, items: PiiItem[]): Claim[] {
  const seen = new Set<string>();
  const spans: Claim[] = [];
  for (const item of items) {
    if (!item.text || seen.has(item.text)) continue;
    seen.add(item.text);
    for (const start of findOccurrences(text, item.text)) {
      spans.push({ start, end: start + item.text.length, item });
    }
  }
  return spans;
}

/**
 * Enabled items are claimed exactly as mask() does (longest first), so the
 * highlights match what will be masked. Disabled items fill the gaps.
 * `segments.map(s => s.text).join("") === text`.
 */
export function buildSegments(text: string, items: PiiItem[]): Segment[] {
  const enabled = claimLongestFirst(spansFor(text, items.filter((i) => i.enabled)));
  const disabled = claimLongestFirst(
    spansFor(text, items.filter((i) => !i.enabled)).filter(
      (span) => !enabled.some((e) => overlaps(e, span)),
    ),
  );
  const claims = [...enabled, ...disabled].sort((a, b) => a.start - b.start);

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
