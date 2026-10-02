import { describe, expect, it } from 'vitest';
import type { TextSegment } from '$lib/shared/text-search';
import { captureHolds } from '../../domain/capture/capture-results';
import type { SearchedCapture } from '../../domain/capture/capture-results';
import { markedLines } from './capture-lines';

function read(text: string, note: string | null): SearchedCapture {
  return { origin: 'recognized', text, note };
}

function wrote(text: string): SearchedCapture {
  return { origin: 'written', text };
}

function lit(segments: readonly TextSegment[] | null): readonly string[] {
  return (segments ?? []).filter((segment) => segment.matched).map((segment) => segment.text);
}

function plain(segments: readonly TextSegment[] | null): string {
  return (segments ?? []).map((segment) => segment.text).join('');
}

describe('markedLines', () => {
  it('marks every occurrence of the query in the recognized text', () => {
    const lines = markedLines(read('ありがとうありがとう', 'ありがとう'), 'ありがとう');

    expect(lit(lines.text)).toEqual(['ありがとう', 'ありがとう']);
  });

  it('marks the query in the note', () => {
    const lines = markedLines(read('おはよう', 'a polite greeting'), 'polite');

    expect(lit(lines.note)).toEqual(['polite']);
  });

  it('keeps the whole recognized text in its segments', () => {
    const lines = markedLines(read('おはようございます', null), 'ござい');

    expect(plain(lines.text)).toBe('おはようございます');
  });

  it('renders a note the query misses, unmarked', () => {
    const capture = read('おはよう', 'a polite greeting');
    const lines = markedLines(capture, 'おはよう');

    expect(plain(lines.note)).toBe('a polite greeting');
    expect(lit(lines.note)).toEqual([]);
    expect(lit(markedLines(capture, 'はよ').note)).toEqual([]);
    expect(lit(markedLines(capture, 'polite').text)).toEqual([]);
  });

  it('reports no note line for a recognized capture carrying none', () => {
    expect(markedLines(read('おはよう', null), 'おはよう').note).toBeNull();
  });

  it('reports no note line for a written capture', () => {
    const lines = markedLines(wrote('a polite greeting'), 'polite');

    expect(lines.note).toBeNull();
    expect(lit(lines.text)).toEqual(['polite']);
  });

  it('folds the query for case, width and kana the way every other search does', () => {
    const lines = markedLines(read('ｱﾘｶﾞﾄｳ', 'Said LOUDLY'), 'ありがとう');

    expect(lit(lines.text)).toEqual(['ｱﾘｶﾞﾄｳ']);
    expect(markedLines(read('ありがとう', 'Said LOUDLY'), 'loudly').matched).toBe(true);
  });

  it('agrees with captureHolds about every capture', () => {
    const captures: readonly SearchedCapture[] = [
      read('おはよう', 'a polite greeting'),
      read('おはよう', null),
      read('polite', 'おはよう'),
      wrote('a polite greeting'),
      wrote('おはよう'),
    ];

    for (const query of ['polite', 'おはよう', 'はよ', 'こんばんは', '']) {
      for (const capture of captures) {
        expect(markedLines(capture, query).matched).toBe(captureHolds(capture, query));
      }
    }
  });
});
