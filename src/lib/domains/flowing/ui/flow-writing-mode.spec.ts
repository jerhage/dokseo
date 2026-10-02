import { describe, expect, it } from 'vitest';
import {
  bookPaging,
  chapterDirection,
  measuredPaging,
  onePagingAxis,
  pagingWritingMode,
  writingModeNamed,
} from './flow-writing-mode';
import type { ChapterProbe, MeasuredChapter } from './flow-writing-mode';

const VERTICAL_TEXT: MeasuredChapter = { writingMode: 'vertical-rl', direction: 'ltr' };

const HEBREW_TEXT: MeasuredChapter = { writingMode: 'horizontal-tb', direction: 'rtl' };

const ENGLISH_TEXT: MeasuredChapter = { writingMode: 'horizontal-tb', direction: 'ltr' };

function probe(
  texts: readonly boolean[],
  measured: MeasuredChapter | null,
): ChapterProbe & {
  readonly measuredAt: number[];
  readonly readAt: number[];
} {
  const measuredAt: number[] = [];
  const readAt: number[] = [];
  return {
    chapters: texts.length,
    hasText: (index) => {
      readAt.push(index);
      return Promise.resolve(texts[index] ?? false);
    },
    measure: (index) => {
      measuredAt.push(index);
      return Promise.resolve(measured);
    },
    measuredAt,
    readAt,
  };
}

describe('writingModeNamed', () => {
  it.each(['vertical-rl', 'vertical-lr'] as const)('reads the vertical mode %s', (mode) => {
    expect(writingModeNamed(mode)).toBe(mode);
  });

  it('ignores the case and the spaces around a declared value', () => {
    expect(writingModeNamed('  Vertical-RL ')).toBe('vertical-rl');
  });

  it.each(['horizontal-tb', 'horizontal-lr', 'horizontal-rl'])(
    'reads the computed or package value %s as horizontal',
    (value) => {
      expect(writingModeNamed(value)).toBe('horizontal');
    },
  );

  it.each(['sideways-rl', null, undefined])('names nothing for %j', (value) => {
    expect(writingModeNamed(value)).toBeNull();
  });
});

describe('chapterDirection', () => {
  it.each([
    [{ bodyDir: '', rootDir: '', direction: 'ltr' }, 'ltr'],
    [{ bodyDir: '', rootDir: '', direction: 'rtl' }, 'rtl'],
    [{ bodyDir: 'rtl', rootDir: '', direction: 'ltr' }, 'rtl'],
    [{ bodyDir: '', rootDir: 'rtl', direction: 'ltr' }, 'rtl'],
  ] as const)('reads a chapter marked %j as %s', (marks, direction) => {
    expect(chapterDirection(marks)).toBe(direction);
  });
});

describe('measuredPaging', () => {
  it('pages vertical text top to bottom', () => {
    expect(measuredPaging(VERTICAL_TEXT)).toEqual({ axis: 'vertical', mode: 'vertical-rl' });
  });

  it.each([
    [HEBREW_TEXT, 'rtl'],
    [ENGLISH_TEXT, 'ltr'],
  ] as const)('pages horizontal text %j sideways, in its own direction', (text, direction) => {
    expect(measuredPaging(text)).toEqual({ axis: 'horizontal', direction });
  });

  it('pages left to right when nothing was measured', () => {
    expect(measuredPaging(null)).toEqual({ axis: 'horizontal', direction: 'ltr' });
  });
});

describe('bookPaging', () => {
  it('takes a declared vertical mode without opening a chapter', async () => {
    const chapters = probe([true], ENGLISH_TEXT);

    expect(await bookPaging('vertical-rl', chapters)).toEqual({
      axis: 'vertical',
      mode: 'vertical-rl',
    });
    expect(chapters.readAt).toEqual([]);
  });

  it('measures the first chapter that holds text when the package declares nothing', async () => {
    const chapters = probe([false, false, true, true], VERTICAL_TEXT);

    expect(await bookPaging(null, chapters)).toEqual({ axis: 'vertical', mode: 'vertical-rl' });
    expect(chapters.measuredAt).toEqual([2]);
    expect(chapters.readAt).toEqual([0, 1, 2]);
  });

  it('measures the direction of a book declared horizontal', async () => {
    expect(await bookPaging('horizontal-rl', probe([true], HEBREW_TEXT))).toEqual({
      axis: 'horizontal',
      direction: 'rtl',
    });
  });

  it('keeps a declared horizontal book horizontal over vertical text', async () => {
    expect(await bookPaging('horizontal-rl', probe([true], VERTICAL_TEXT))).toEqual({
      axis: 'horizontal',
      direction: 'ltr',
    });
  });

  it('measures the text when the package declares a value it does not know', async () => {
    expect(
      await bookPaging('upright', probe([true], { writingMode: 'vertical-lr', direction: 'ltr' })),
    ).toEqual({ axis: 'vertical', mode: 'vertical-lr' });
  });

  it('pages left to right when no chapter holds text', async () => {
    const chapters = probe([false, false], VERTICAL_TEXT);

    expect(await bookPaging(null, chapters)).toEqual({ axis: 'horizontal', direction: 'ltr' });
    expect(chapters.measuredAt).toEqual([]);
  });

  it('pages left to right when the measure fails', async () => {
    expect(await bookPaging(null, probe([true], null))).toEqual({
      axis: 'horizontal',
      direction: 'ltr',
    });
  });
});

describe('pagingWritingMode', () => {
  it('lays a vertical book out in its vertical mode', () => {
    expect(pagingWritingMode({ axis: 'vertical', mode: 'vertical-lr' })).toBe('vertical-lr');
  });

  it('lays a horizontal book out horizontally, whatever its direction', () => {
    expect(pagingWritingMode({ axis: 'horizontal', direction: 'rtl' })).toBe('horizontal');
  });
});

describe('onePagingAxis', () => {
  it('sets the root and the body of every chapter to the vertical mode', () => {
    expect(onePagingAxis('vertical-rl')).toMatch(
      /html, body \{\s*writing-mode: vertical-rl !important;\s*\}/u,
    );
  });

  it('adds nothing for a horizontal book', () => {
    expect(onePagingAxis('horizontal')).toBe('');
  });
});
