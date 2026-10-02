import type { Relocation } from 'foliate-js/view.js';
import { describe, expect, it } from 'vitest';
import {
  chapterTicks,
  flowLocation,
  flowMeta,
  flowProgress,
  MAX_CHAPTER_TICKS,
  progressLabel,
  PROGRESS_UNKNOWN_LABEL,
  reportedChapter,
  scrubbedFraction,
  TICK_EDGE_MARGIN,
  tickOffsets,
} from './flow-progress';
import type { FlowLocation } from './flow-progress';

const SOMEWHERE = 'epubcfi(/6/14!/4/2/14/1:0)';

function at(relocation: Partial<Relocation> = {}): Relocation {
  return { cfi: SOMEWHERE, ...relocation };
}

function located(location: Partial<FlowLocation> = {}): FlowLocation {
  return { cfi: SOMEWHERE, fraction: null, chapter: null, ...location };
}

function spread(count: number): readonly number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) / (count + 1));
}

describe('flowLocation', () => {
  it('reads the cfi, the fraction and the chapter a relocation carries', () => {
    expect(flowLocation(at({ fraction: 0.4, tocItem: { label: 'Chapter Two' } }))).toEqual({
      cfi: SOMEWHERE,
      fraction: 0.4,
      chapter: 'Chapter Two',
    });
  });

  it.each([
    ['whose progress foliate never built', at()],
    ['whose sections all measure nothing', at({ fraction: Number.NaN })],
  ])('reports no fraction for a book %s', (_book, relocation) => {
    expect(flowLocation(relocation).fraction).toBeNull();
  });

  it('holds a reported fraction inside the book', () => {
    expect(flowLocation(at({ fraction: 1.4 })).fraction).toBe(1);
    expect(flowLocation(at({ fraction: -0.2 })).fraction).toBe(0);
  });

  it.each([
    [at(), null],
    [at({ tocItem: null }), null],
    [at({ tocItem: {} }), null],
    [at({ tocItem: { label: '  ' } }), null],
    [at({ tocItem: { label: '\n  第一章\n  上\n' } }), '第一章 上'],
  ])(
    'reads the chapter of %j as the table of contents names it, collapsed',
    (relocation, chapter) => {
      expect(flowLocation(relocation).chapter).toBe(chapter);
    },
  );
});

describe('reportedChapter', () => {
  it('keeps an ideographic space inside a chapter label', () => {
    expect(reportedChapter('第三章\u3000海辺')).toBe('第三章\u3000海辺');
  });

  it('collapses runs of other whitespace around a kept ideographic space', () => {
    expect(reportedChapter('第三章\u3000海辺 \n\t 上')).toBe('第三章\u3000海辺 上');
  });

  it('trims ideographic and other spaces from both ends of a chapter label', () => {
    expect(reportedChapter('\u3000\n 第三章\u3000海辺 \u3000')).toBe('第三章\u3000海辺');
    expect(reportedChapter('\u3000\u3000')).toBeNull();
  });
});

describe('flowProgress', () => {
  it.each([
    ['before the book has said where it is', null],
    ['for a book that cannot say how far through it is', located()],
  ])('reports nothing %s', (_when, location) => {
    expect(flowProgress(location)).toEqual({ kind: 'unknown' });
  });

  it('rounds a reported fraction to a whole percent', () => {
    expect(flowProgress(located({ fraction: 0.375 }))).toEqual({
      kind: 'known',
      fraction: 0.375,
      percent: 38,
    });
  });

  it('keeps the start of a book apart from a book that cannot report one', () => {
    expect(flowProgress(located({ fraction: 0 }))).toEqual({
      kind: 'known',
      fraction: 0,
      percent: 0,
    });
  });
});

describe('progressLabel', () => {
  it('says plainly that a book reports no progress rather than showing a figure', () => {
    expect(progressLabel(flowProgress(located()))).toBe(PROGRESS_UNKNOWN_LABEL);
    expect(PROGRESS_UNKNOWN_LABEL).not.toContain('0');
  });

  it('states the percent a book reports', () => {
    expect(progressLabel(flowProgress(located({ fraction: 0.5 })))).toBe('50%');
  });
});

describe('scrubbedFraction', () => {
  it('refuses a scrub on a book that reports no progress', () => {
    expect(scrubbedFraction(flowProgress(located()), 0.5)).toBeNull();
  });

  it('passes a scrub through on a book that reports progress', () => {
    expect(scrubbedFraction(flowProgress(located({ fraction: 0.1 })), 0.5)).toBe(0.5);
  });

  it('holds a scrub inside the book', () => {
    const progress = flowProgress(located({ fraction: 0.1 }));

    expect(scrubbedFraction(progress, 3)).toBe(1);
    expect(scrubbedFraction(progress, -3)).toBe(0);
  });

  it('refuses a scrub that is not a number at all', () => {
    expect(scrubbedFraction(flowProgress(located({ fraction: 0.1 })), Number.NaN)).toBeNull();
  });
});

describe('chapterTicks', () => {
  it('marks nothing for a book that lists no sections at all', () => {
    expect(chapterTicks(null)).toEqual([]);
    expect(chapterTicks(undefined)).toEqual([]);
    expect(chapterTicks([])).toEqual([]);
  });

  it('drops a boundary that is not a number the bar can place', () => {
    expect(chapterTicks([0.4, Number.NaN, Number.POSITIVE_INFINITY])).toEqual([0.4]);
  });

  it('drops a boundary that falls outside the bar', () => {
    expect(chapterTicks([-0.2, 0.4, 1.4])).toEqual([0.4]);
  });

  it.each([
    [[0, Number.EPSILON, TICK_EDGE_MARGIN, 0.4, 1 - TICK_EDGE_MARGIN, 1], [0.4]],
    [[Number.EPSILON], []],
  ])('drops the boundary at the very start and the one at the very end of %j', (bounds, ticks) => {
    expect(chapterTicks(bounds)).toEqual(ticks);
  });

  it('marks a repeated boundary once', () => {
    expect(chapterTicks([0.4, 0.4, 0.6])).toEqual([0.4, 0.6]);
  });

  it.each([[[0.25, 0.5, 0.75]], [[0.75, 0.25, 0.5]]])(
    'marks every boundary of %j in order along the bar',
    (bounds) => {
      expect(chapterTicks(bounds)).toEqual([0.25, 0.5, 0.75]);
    },
  );

  it('marks nothing for a book with more boundaries than the bar can separate', () => {
    expect(chapterTicks(spread(MAX_CHAPTER_TICKS))).toHaveLength(MAX_CHAPTER_TICKS);
    expect(chapterTicks(spread(MAX_CHAPTER_TICKS + 1))).toEqual([]);
  });

  it('counts only the boundaries it would draw against that limit', () => {
    expect(chapterTicks([0, 1, ...spread(MAX_CHAPTER_TICKS)])).toHaveLength(MAX_CHAPTER_TICKS);
  });
});

describe('tickOffsets', () => {
  it('places a boundary that far along a left-to-right bar', () => {
    expect(tickOffsets([0.25, 0.5], 'ltr')).toEqual([25, 50]);
  });

  it('places a boundary that far from the right-hand end of a right-to-left bar', () => {
    expect(tickOffsets([0.25, 0.5], 'rtl')).toEqual([75, 50]);
  });

  it('places a boundary a third of the way along without a trail of digits', () => {
    expect(tickOffsets([1 / 3], 'ltr')).toEqual([33.33]);
    expect(tickOffsets([1 / 3], 'rtl')).toEqual([66.67]);
  });
});

describe('flowMeta', () => {
  it('names the chapter and the language the book is read in', () => {
    expect(flowMeta('Chapter Two', 'ja')).toBe('Chapter Two · Japanese');
  });

  it('names the language alone when no chapter is known', () => {
    expect(flowMeta(null, 'ko')).toBe('Korean');
  });
});
