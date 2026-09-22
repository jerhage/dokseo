import type { Relocation } from 'foliate-js/view.js';
import { describe, expect, it } from 'vitest';
import {
  flowLocation,
  flowMeta,
  flowProgress,
  progressLabel,
  PROGRESS_UNKNOWN_LABEL,
  scrubbedFraction,
} from './flow-progress';
import type { FlowLocation } from './flow-progress';

const SOMEWHERE = 'epubcfi(/6/14!/4/2/14/1:0)';

function at(relocation: Partial<Relocation> = {}): Relocation {
  return { cfi: SOMEWHERE, ...relocation };
}

function located(location: Partial<FlowLocation> = {}): FlowLocation {
  return { cfi: SOMEWHERE, fraction: null, chapter: null, ...location };
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

describe('flowMeta', () => {
  it('names the chapter and the language the book is read in', () => {
    expect(flowMeta('Chapter Two', 'ja')).toBe('Chapter Two · Japanese');
  });

  it('names the language alone when no chapter is known', () => {
    expect(flowMeta(null, 'ko')).toBe('Korean');
  });
});
