import { describe, expect, it } from 'vitest';
import type { TextQuote } from '$lib/shared/anchor';
import {
  arrivedAtTheCfi,
  foundByItsText,
  MOVED_SINCE_IT_WAS_CAPTURED,
  NOT_IN_THE_BOOK_ANY_MORE,
  THE_PASSAGE_IS_LOST,
  locateQuote,
  passageNotice,
  pointIn,
} from './flow-quote';

const SOMEWHERE = 'epubcfi(/6/14!/4/2/14/1:0)';

const CHAPTER = 'その病室は、外から厳重に鍵がかけられていた。「はい」と答えた。';

function quote(exact: string, prefix: string, suffix: string): TextQuote {
  return { exact, prefix, suffix };
}

describe('locateQuote', () => {
  it('finds the passage the quote names', () => {
    expect(locateQuote(CHAPTER, quote('厳重に鍵', 'その病室は、外から', 'がかけられて'))).toEqual({
      start: 9,
      end: 13,
    });
  });

  it('finds the passage when its context moved away', () => {
    expect(locateQuote(CHAPTER, quote('厳重に鍵', 'まるで違う文章', 'これも違う'))).toEqual({
      start: 9,
      end: 13,
    });
  });

  it('reports nothing when the text is nowhere in the chapter', () => {
    expect(locateQuote(CHAPTER, quote('存在しない一節', '', ''))).toBeNull();
  });

  it('reports nothing for an empty quote rather than matching everywhere', () => {
    expect(locateQuote(CHAPTER, quote('', 'その', '病室'))).toBeNull();
  });

  it('picks the repeat whose prefix agrees', () => {
    const repeated = 'ある日「はい」と答えた。次の日「はい」と答えた。';

    expect(locateQuote(repeated, quote('「はい」', '次の日', 'と答えた。'))).toEqual({
      start: 15,
      end: 19,
    });
  });

  it('picks the repeat whose suffix agrees', () => {
    const repeated = '「はい」と答えた。「はい」と黙った。';

    expect(locateQuote(repeated, quote('「はい」', '', 'と黙った。'))).toEqual({
      start: 9,
      end: 13,
    });
  });

  it('keeps the first repeat when no context agrees with either', () => {
    const repeated = '「はい」と答えた。「はい」と答えた。';

    expect(locateQuote(repeated, quote('「はい」', 'まるで違う', 'これも違う'))).toEqual({
      start: 0,
      end: 4,
    });
  });
});

describe('pointIn', () => {
  it('lands in the part that holds the offset', () => {
    expect(pointIn([4, 6, 5], 7)).toEqual({ part: 1, offset: 3 });
  });

  it('lands at the start of the first part for offset zero', () => {
    expect(pointIn([4, 6], 0)).toEqual({ part: 0, offset: 0 });
  });

  it('lands at the end of the earlier part on a boundary', () => {
    expect(pointIn([4, 6], 4)).toEqual({ part: 0, offset: 4 });
  });

  it('lands at the very end of the last part', () => {
    expect(pointIn([4, 6], 10)).toEqual({ part: 1, offset: 6 });
  });

  it('reports nothing past the end', () => {
    expect(pointIn([4, 6], 11)).toBeNull();
  });

  it('reports nothing for a negative offset', () => {
    expect(pointIn([4, 6], -1)).toBeNull();
  });

  it('reports nothing when there is no text at all', () => {
    expect(pointIn([], 0)).toBeNull();
  });
});

describe('passageNotice', () => {
  it('says nothing when the stored cfi took the reader there', () => {
    expect(passageNotice(arrivedAtTheCfi(SOMEWHERE))).toBeNull();
  });

  it('says the passage moved when its text found it instead', () => {
    expect(passageNotice(foundByItsText(SOMEWHERE))).toBe(MOVED_SINCE_IT_WAS_CAPTURED);
  });

  it('says the passage is gone when neither found it', () => {
    expect(passageNotice(THE_PASSAGE_IS_LOST)).toBe(NOT_IN_THE_BOOK_ANY_MORE);
  });
});
