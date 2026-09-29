import { describe, expect, it } from 'vitest';
import type { TocProgress } from 'foliate-js/view.js';
import { passageChapter } from './flow-passage';
import type { ChapterTitles } from './flow-passage';

const SELECTION = {} as Range;

function titled(progress: TocProgress): ChapterTitles & { readonly asked: number[] } {
  const asked: number[] = [];
  return {
    asked,
    getProgressOf: (index: number) => {
      asked.push(index);
      return progress;
    },
  };
}

describe('passageChapter', () => {
  it('names the chapter the table of contents gives the selection', () => {
    const titles = titled({ tocItem: { label: '第三章 海辺' } });

    expect(passageChapter(titles, 4, SELECTION)).toBe('第三章 海辺');
    expect(titles.asked).toEqual([4]);
  });

  it('collapses the white space inside a chapter label', () => {
    expect(passageChapter(titled({ tocItem: { label: '  제1장\n  바다 ' } }), 0, SELECTION)).toBe(
      '제1장 바다',
    );
  });

  it('falls back to no chapter for a blank label', () => {
    expect(passageChapter(titled({ tocItem: { label: '   ' } }), 0, SELECTION)).toBeNull();
  });

  it('falls back to no chapter when the selection sits under no table of contents entry', () => {
    expect(passageChapter(titled({ tocItem: null }), 0, SELECTION)).toBeNull();
    expect(passageChapter(titled({}), 0, SELECTION)).toBeNull();
  });

  it('falls back to no chapter when the view cannot place the selection', () => {
    const titles: ChapterTitles = {
      getProgressOf: () => {
        throw new Error('the section is not loaded');
      },
    };

    expect(passageChapter(titles, 0, SELECTION)).toBeNull();
  });
});
