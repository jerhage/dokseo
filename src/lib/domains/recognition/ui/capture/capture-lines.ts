import { segmentsOf, textMatches } from '$lib/shared/text-search';
import type { TextSegment } from '$lib/shared/text-search';
import { noteOn } from '../../domain/capture/capture-results';
import type { SearchedCapture } from '../../domain/capture/capture-results';

type MarkedLines = {
  readonly text: readonly TextSegment[];
  readonly note: readonly TextSegment[] | null;
  readonly matched: boolean;
};

function markedLines(capture: SearchedCapture, query: string): MarkedLines {
  const inText = textMatches(capture.text, query);
  const note = noteOn(capture);
  const inNote = note === null ? [] : textMatches(note, query);

  return {
    text: segmentsOf(capture.text, inText),
    note: note === null ? null : segmentsOf(note, inNote),
    matched: inText.length > 0 || inNote.length > 0,
  };
}

export { markedLines };
export type { MarkedLines };
