import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import { highlightChange, passageCfis } from './flow-highlight';

const FIRST = 'epubcfi(/6/14!/4/2/14/1:0)';

const SECOND = 'epubcfi(/6/16!/4/2/2/1:12)';

const QUOTE = { exact: 'はい', prefix: 'と', suffix: 'と答えた' };

function lifted(cfi: string): Anchor {
  return textAnchor(cfi, QUOTE);
}

function onAPage(): Anchor {
  return regionAnchor([{ index: imageIndex(13), rect: imageRect(10, 20, 100, 40) }]);
}

describe('passageCfis', () => {
  it('draws one highlight for each passage lifted from the book', () => {
    expect(passageCfis([lifted(FIRST), lifted(SECOND)])).toEqual([FIRST, SECOND]);
  });

  it('draws nothing for a capture anchored to a region of a page image', () => {
    expect(passageCfis([onAPage(), lifted(FIRST)])).toEqual([FIRST]);
  });

  it('draws one highlight when two captures quote the same passage', () => {
    expect(passageCfis([lifted(FIRST), lifted(FIRST)])).toEqual([FIRST]);
  });

  it('draws nothing for a passage whose cfi was never recorded', () => {
    expect(passageCfis([lifted('')])).toEqual([]);
  });

  it('draws nothing when the book holds no captures', () => {
    expect(passageCfis([])).toEqual([]);
  });
});

describe('highlightChange', () => {
  it('adds a passage that is not drawn yet', () => {
    expect(highlightChange(new Set([FIRST]), [FIRST, SECOND])).toEqual({
      added: [SECOND],
      removed: [],
    });
  });

  it('removes a passage whose capture is gone', () => {
    expect(highlightChange(new Set([FIRST, SECOND]), [SECOND])).toEqual({
      added: [],
      removed: [FIRST],
    });
  });

  it('leaves an unchanged passage alone', () => {
    expect(highlightChange(new Set([FIRST]), [FIRST])).toEqual({ added: [], removed: [] });
  });

  it('removes every passage when the reader clears the captures', () => {
    expect(highlightChange(new Set([FIRST, SECOND]), [])).toEqual({
      added: [],
      removed: [FIRST, SECOND],
    });
  });
});
