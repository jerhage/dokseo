import type { TextSegment } from '$lib/shared/text-search';

type NoteLine = readonly TextSegment[];

function noteLines(segments: readonly TextSegment[]): readonly NoteLine[] {
  const lines: TextSegment[][] = [[]];

  for (const segment of segments) {
    segment.text.split('\n').forEach((part, order) => {
      if (order > 0) lines.push([]);
      if (part.length > 0) lines.at(-1)?.push({ text: part, matched: segment.matched });
    });
  }

  return lines;
}

function plainSegments(text: string): readonly TextSegment[] {
  return [{ text, matched: false }];
}

export { noteLines, plainSegments };
export type { NoteLine };
