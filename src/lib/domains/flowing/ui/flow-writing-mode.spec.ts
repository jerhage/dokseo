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
  it('reads a right-to-left vertical mode', () => {
    expect(writingModeNamed('vertical-rl')).toBe('vertical-rl');
  });

  it('reads a left-to-right vertical mode', () => {
    expect(writingModeNamed('vertical-lr')).toBe('vertical-lr');
  });

  it('ignores the case and the spaces around a declared value', () => {
    expect(writingModeNamed('  Vertical-RL ')).toBe('vertical-rl');
  });

  it('reads the computed horizontal mode as horizontal', () => {
    expect(writingModeNamed('horizontal-tb')).toBe('horizontal');
  });

  it('reads either horizontal package value as horizontal', () => {
    expect(writingModeNamed('horizontal-lr')).toBe('horizontal');
    expect(writingModeNamed('horizontal-rl')).toBe('horizontal');
  });

  it('names nothing for a value it does not know', () => {
    expect(writingModeNamed('sideways-rl')).toBeNull();
  });

  it('names nothing for a missing value', () => {
    expect(writingModeNamed(null)).toBeNull();
    expect(writingModeNamed(undefined)).toBeNull();
  });
});

describe('chapterDirection', () => {
  it('reads a chapter with no right-to-left mark as left to right', () => {
    expect(chapterDirection({ bodyDir: '', rootDir: '', direction: 'ltr' })).toBe('ltr');
  });

  it('reads a right-to-left computed direction', () => {
    expect(chapterDirection({ bodyDir: '', rootDir: '', direction: 'rtl' })).toBe('rtl');
  });

  it('reads a right-to-left dir on the body', () => {
    expect(chapterDirection({ bodyDir: 'rtl', rootDir: '', direction: 'ltr' })).toBe('rtl');
  });

  it('reads a right-to-left dir on the root', () => {
    expect(chapterDirection({ bodyDir: '', rootDir: 'rtl', direction: 'ltr' })).toBe('rtl');
  });
});

describe('measuredPaging', () => {
  it('pages vertical text top to bottom', () => {
    expect(measuredPaging(VERTICAL_TEXT)).toEqual({ axis: 'vertical', mode: 'vertical-rl' });
  });

  it('pages right-to-left horizontal text sideways, right to left', () => {
    expect(measuredPaging(HEBREW_TEXT)).toEqual({ axis: 'horizontal', direction: 'rtl' });
  });

  it('pages left-to-right horizontal text sideways, left to right', () => {
    expect(measuredPaging(ENGLISH_TEXT)).toEqual({ axis: 'horizontal', direction: 'ltr' });
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
