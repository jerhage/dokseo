import { describe, expect, it } from 'vitest';
import { imageIndex } from './ids';
import {
  imagePlace,
  readingStarted,
  resumedCfi,
  samePlace,
  showsTheEnd,
  START_OF_THE_TEXT,
  textPlace,
} from './reading-place';
import type { ReadingPlace } from './reading-place';

describe('imagePlace', () => {
  it('holds the image index it was given, the first image included', () => {
    for (const index of [7, 0]) {
      expect(imagePlace(imageIndex(index))).toEqual({
        kind: 'image',
        index,
        shownThrough: index,
        offset: 0,
      });
    }
  });

  it('holds the last image shown beside the image the place opens at', () => {
    expect(imagePlace(imageIndex(3), imageIndex(4))).toEqual({
      kind: 'image',
      index: 3,
      shownThrough: 4,
      offset: 0,
    });
  });

  it('raises a last image shown before the opening image to the opening image', () => {
    expect(imagePlace(imageIndex(5), imageIndex(2))).toEqual({
      kind: 'image',
      index: 5,
      shownThrough: 5,
      offset: 0,
    });
  });
});

describe('the offset an image place carries', () => {
  it('holds the fraction down the image it was given', () => {
    expect(imagePlace(imageIndex(3), imageIndex(3), 0.42).offset).toBe(0.42);
  });

  it('pulls an offset past the bottom of the image back to the bottom', () => {
    expect(imagePlace(imageIndex(3), imageIndex(3), 1.5).offset).toBe(1);
  });

  it('pulls an offset above the top of the image back to the top', () => {
    expect(imagePlace(imageIndex(3), imageIndex(3), -0.2).offset).toBe(0);
  });

  it('holds the top of the image for an offset that could not be measured', () => {
    expect(imagePlace(imageIndex(3), imageIndex(3), Number.NaN).offset).toBe(0);
    expect(imagePlace(imageIndex(3), imageIndex(3), Number.POSITIVE_INFINITY).offset).toBe(0);
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

  it('separates two image places at the same index that sit at different offsets', () => {
    expect(
      samePlace(
        imagePlace(imageIndex(7), imageIndex(7), 0.2),
        imagePlace(imageIndex(7), imageIndex(7), 0.6),
      ),
    ).toBe(false);
  });

  it('matches two image places at the same index and the same offset', () => {
    expect(
      samePlace(
        imagePlace(imageIndex(7), imageIndex(7), 0.6),
        imagePlace(imageIndex(7), imageIndex(7), 0.6),
      ),
    ).toBe(true);
  });

  it('separates two image places at different indexes', () => {
    expect(samePlace(imagePlace(imageIndex(7)), imagePlace(imageIndex(8)))).toBe(false);
  });

  it('separates two image places at one index that showed different last images', () => {
    expect(
      samePlace(imagePlace(imageIndex(3), imageIndex(3)), imagePlace(imageIndex(3), imageIndex(4))),
    ).toBe(false);
  });

  it('separates an image place from a text place', () => {
    expect(samePlace(imagePlace(imageIndex(0)), textPlace('epubcfi(/6/4!/2)', 0))).toBe(false);
    expect(samePlace(textPlace('epubcfi(/6/4!/2)', 0), imagePlace(imageIndex(0)))).toBe(false);
  });
});

describe('showsTheEnd', () => {
  it('reports the end for a place that showed the last image of the book', () => {
    expect(showsTheEnd(imagePlace(imageIndex(3), imageIndex(4)), 5)).toBe(true);
    expect(showsTheEnd(imagePlace(imageIndex(4)), 5)).toBe(true);
  });

  it('reports no end for a place that showed up to the image before the last', () => {
    expect(showsTheEnd(imagePlace(imageIndex(2), imageIndex(3)), 5)).toBe(false);
    expect(showsTheEnd(imagePlace(imageIndex(3)), 5)).toBe(false);
  });

  it('reports the end for a text read to its end', () => {
    expect(showsTheEnd(textPlace('epubcfi(/6/40!/4/2)', 1), 0)).toBe(true);
  });

  it('reports the end for a text whose last page summed a rounding short of one', () => {
    expect(showsTheEnd(textPlace('epubcfi(/6/40!/4/2)', 0.9999999999999999), 0)).toBe(true);
  });

  it('reports no end for a text one small page short of its end', () => {
    expect(showsTheEnd(textPlace('epubcfi(/6/40!/4/2)', 0.9999), 0)).toBe(false);
  });

  it('reports no end for a text that measured no fraction', () => {
    expect(showsTheEnd(textPlace('epubcfi(/6/40!/4/2)', null), 0)).toBe(false);
  });
});

describe('readingStarted', () => {
  const READ_AT = 1758300000000;

  it('counts an image place past the first image as started, read or not', () => {
    expect(readingStarted(imagePlace(imageIndex(2)), 10, null)).toBe(true);
  });

  it('reports a book at its first image that no reader saved as not started', () => {
    expect(readingStarted(imagePlace(imageIndex(0)), 1, null)).toBe(false);
    expect(readingStarted(imagePlace(imageIndex(0), imageIndex(1)), 2, null)).toBe(false);
  });

  it('counts a saved first group that shows the last image as started', () => {
    expect(readingStarted(imagePlace(imageIndex(0)), 1, READ_AT)).toBe(true);
    expect(readingStarted(imagePlace(imageIndex(0), imageIndex(1)), 2, READ_AT)).toBe(true);
  });

  it('reports a saved first group short of the end as not started', () => {
    expect(readingStarted(imagePlace(imageIndex(0), imageIndex(1)), 6, READ_AT)).toBe(false);
  });

  it('counts a text place as started once it names a place in the text', () => {
    expect(readingStarted(START_OF_THE_TEXT, 0, READ_AT)).toBe(false);
    expect(readingStarted(textPlace('epubcfi(/6/4!/2)', null), 0, null)).toBe(true);
  });
});
