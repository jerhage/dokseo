import type { HighlightSegment } from '../components/highlight';

function literalPattern(query: string): RegExp {
  return new RegExp(query.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'giu');
}

function markedSegments(text: string, query: string): readonly HighlightSegment[] {
  const needle = query.trim();
  const matches = needle === '' ? [] : Array.from(text.matchAll(literalPattern(needle)));
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const found of matches) {
    if (found.index > cursor) {
      segments.push({ text: text.slice(cursor, found.index), matched: false });
    }
    segments.push({ text: found[0], matched: true });
    cursor = found.index + found[0].length;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), matched: false });
  return segments;
}

export { markedSegments };
