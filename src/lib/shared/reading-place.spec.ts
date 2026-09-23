import { describe, expect, it } from 'vitest';
import { imageIndex } from './ids';
import { imagePlace, resumedCfi, samePlace, START_OF_THE_TEXT, textPlace } from './reading-place';
import type { ReadingPlace } from './reading-place';

describe('imagePlace', () => {
  it('holds the image index it was given', () => {
    expect(imagePlace(imageIndex(7))).toEqual({ kind: 'image', index: 7 });
  });

  it('holds the first image without treating it as absent', () => {
    expect(imagePlace(imageIndex(0))).toEqual({ kind: 'image', index: 0 });
  });
});

describe('textPlace', () => {
  it('holds the cfi it was given', () => {
    expect(textPlace('epubcfi(/6/14!/4/2/14/1:0)', null)).toEqual({
      kind: 'text',
      cfi: 'epubcfi(/6/14!/4/2/14/1:0)',
      fraction: null,
    });
  });

  it('carries no quote, because a place is not an anchor', () => {
    expect(Object.keys(textPlace('epubcfi(/6/4!/2)', null))).toEqual(['kind', 'cfi', 'fraction']);
  });
});

const AT_A_CHAPTER = 'epubcfi(/6/4!/2)';

function placed(fraction: number | null): ReadingPlace {
  return { kind: 'text', cfi: AT_A_CHAPTER, fraction };
}

describe('the fraction a text place carries', () => {
  it('holds the fraction it was given', () => {
    expect(textPlace(AT_A_CHAPTER, 0.37)).toEqual(placed(0.37));
  });

  it('holds a book opened at its very first character without treating it as absent', () => {
    expect(textPlace(AT_A_CHAPTER, 0)).toEqual(placed(0));
  });

  it('holds no fraction when the book reported none', () => {
    expect(textPlace(AT_A_CHAPTER, null)).toEqual(placed(null));
  });

  it('pulls a fraction past the end of the book back to the end', () => {
    expect(textPlace(AT_A_CHAPTER, 1.4)).toEqual(placed(1));
  });

  it('pulls a fraction before the start of the book back to the start', () => {
    expect(textPlace(AT_A_CHAPTER, -0.2)).toEqual(placed(0));
  });

  it('holds no fraction for a number the book could not measure', () => {
    expect(textPlace(AT_A_CHAPTER, Number.NaN)).toEqual(placed(null));
    expect(textPlace(AT_A_CHAPTER, Number.POSITIVE_INFINITY)).toEqual(placed(null));
  });
});

describe('START_OF_THE_TEXT', () => {
  it('names the empty cfi and the absent fraction a flow book is stored with', () => {
    expect(START_OF_THE_TEXT).toEqual({ kind: 'text', cfi: '', fraction: null });
  });
});

describe('resumedCfi', () => {
  it('answers the cfi a text place holds', () => {
    expect(resumedCfi(textPlace('epubcfi(/6/14!/4/2/14/1:0)', null))).toBe(
      'epubcfi(/6/14!/4/2/14/1:0)',
    );
  });

  it('answers nothing for a book still at the start of its text', () => {
    expect(resumedCfi(START_OF_THE_TEXT)).toBeNull();
  });

  it('answers nothing for an image place, which names no cfi', () => {
    expect(resumedCfi(imagePlace(imageIndex(3)))).toBeNull();
  });
});

describe('samePlace', () => {
  it('matches two text places holding the same cfi and the same fraction', () => {
    expect(samePlace(textPlace('epubcfi(/6/4!/2)', 0.4), textPlace('epubcfi(/6/4!/2)', 0.4))).toBe(
      true,
    );
  });

  it('separates two text places at the same cfi that report different fractions', () => {
    expect(samePlace(textPlace('epubcfi(/6/4!/2)', 0.4), textPlace('epubcfi(/6/4!/2)', 0.5))).toBe(
      false,
    );
  });

  it('separates a place that gained a fraction from the one stored without it', () => {
    expect(samePlace(textPlace('epubcfi(/6/4!/2)', null), textPlace('epubcfi(/6/4!/2)', 0.4))).toBe(
      false,
    );
  });

  it('separates two text places holding different cfis', () => {
    expect(samePlace(textPlace('epubcfi(/6/4!/2)', 0.4), textPlace('epubcfi(/6/6!/2)', 0.4))).toBe(
      false,
    );
  });

  it('matches two image places at the same index', () => {
    expect(samePlace(imagePlace(imageIndex(7)), imagePlace(imageIndex(7)))).toBe(true);
  });

  it('separates two image places at different indexes', () => {
    expect(samePlace(imagePlace(imageIndex(7)), imagePlace(imageIndex(8)))).toBe(false);
  });

  it('separates an image place from a text place', () => {
    expect(samePlace(imagePlace(imageIndex(0)), textPlace('epubcfi(/6/4!/2)', 0))).toBe(false);
    expect(samePlace(textPlace('epubcfi(/6/4!/2)', 0), imagePlace(imageIndex(0)))).toBe(false);
  });
});
