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

  it('reports no fraction for a book whose progress foliate never built', () => {
    expect(flowLocation(at()).fraction).toBeNull();
  });

  it('reports no fraction for a book whose sections all measure nothing', () => {
    expect(flowLocation(at({ fraction: Number.NaN })).fraction).toBeNull();
  });

  it('holds a reported fraction inside the book', () => {
    expect(flowLocation(at({ fraction: 1.4 })).fraction).toBe(1);
    expect(flowLocation(at({ fraction: -0.2 })).fraction).toBe(0);
  });

  it('reports no chapter for a section the table of contents does not name', () => {
    expect(flowLocation(at()).chapter).toBeNull();
    expect(flowLocation(at({ tocItem: null })).chapter).toBeNull();
    expect(flowLocation(at({ tocItem: {} })).chapter).toBeNull();
    expect(flowLocation(at({ tocItem: { label: '  ' } })).chapter).toBeNull();
  });

  it('collapses the whitespace a chapter heading was laid out with', () => {
    expect(flowLocation(at({ tocItem: { label: '\n  第一章\n  上\n' } })).chapter).toBe(
      '第一章 上',
    );
  });
});

describe('flowProgress', () => {
  it('reports nothing before the book has said where it is', () => {
    expect(flowProgress(null)).toEqual({ kind: 'unknown' });
  });

  it('reports nothing for a book that cannot say how far through it is', () => {
    expect(flowProgress(located())).toEqual({ kind: 'unknown' });
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
  it('marks every boundary a book reports between its chapters', () => {
    expect(chapterTicks([0.25, 0.5, 0.75])).toEqual([0.25, 0.5, 0.75]);
  });

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

  it('drops the boundary at the very start and the one at the very end', () => {
    const margin = TICK_EDGE_MARGIN;

    expect(chapterTicks([0, Number.EPSILON, margin, 0.4, 1 - margin, 1])).toEqual([0.4]);
  });

  it('marks a repeated boundary once', () => {
    expect(chapterTicks([0.4, 0.4, 0.6])).toEqual([0.4, 0.6]);
  });

  it('orders the boundaries along the bar', () => {
    expect(chapterTicks([0.75, 0.25, 0.5])).toEqual([0.25, 0.5, 0.75]);
  });

  it('marks nothing for a novel that arrives as a single file', () => {
    expect(chapterTicks([Number.EPSILON])).toEqual([]);
  });

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

  it('places nothing for a book with no boundaries to mark', () => {
    expect(tickOffsets([], 'rtl')).toEqual([]);
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
