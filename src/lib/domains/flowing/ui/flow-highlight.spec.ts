import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import {
  highlightChange,
  markAfterMove,
  NOTHING_ARRIVED_AT,
  passageCfis,
  passageMark,
  passageWeight,
} from './flow-highlight';
import type { PassageMark, PassageWeight } from './flow-highlight';
import { arrivedAtTheCfi, foundByItsText, THE_PASSAGE_IS_LOST } from './flow-quote';

const FIRST = 'epubcfi(/6/14!/4/2/14/1:0)';

const SECOND = 'epubcfi(/6/16!/4/2/2/1:12)';

const QUOTE = { exact: 'はい', prefix: 'と', suffix: 'と答えた' };

const A_PAGE = 'epubcfi(/6/14!/4/2/10,/1:0,/1:14)';

const ANOTHER_PAGE = 'epubcfi(/6/14!/4/2/22,/1:0,/1:9)';

function jumpedTo(cfi: string, place: string | null = A_PAGE): PassageMark {
  return passageMark(arrivedAtTheCfi(cfi), place);
}

function drawn(passages: Readonly<Record<string, PassageWeight>>): Map<string, PassageWeight> {
  return new Map(Object.entries(passages));
}

function lifted(cfi: string): Anchor {
  return textAnchor(cfi, QUOTE);
}

function onAPage(): Anchor {
  return regionAnchor([
    {
      index: imageIndex(13),
      rect: imageRect(10, 20, 100, 40),
    },
  ]);
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

describe('passageWeight', () => {
  it('weights the passage the reader jumped to apart from the rest', () => {
    expect(passageWeight(FIRST, jumpedTo(FIRST))).toBe('arrived');
  });

  it('weights every other passage the same as before', () => {
    expect(passageWeight(SECOND, jumpedTo(FIRST))).toBe('ordinary');
  });

  it('weights every passage the same while the reader has jumped nowhere', () => {
    expect(passageWeight(FIRST, NOTHING_ARRIVED_AT)).toBe('ordinary');
  });
});

describe('passageMark', () => {
  it('marks the stored passage the jump resolved', () => {
    expect(passageMark(arrivedAtTheCfi(FIRST), A_PAGE)).toEqual({
      kind: 'arrived',
      cfi: FIRST,
      place: A_PAGE,
    });
  });

  it('marks the fresh cfi when the passage was found by its text instead', () => {
    expect(passageMark(foundByItsText(SECOND), A_PAGE)).toEqual({
      kind: 'arrived',
      cfi: SECOND,
      place: A_PAGE,
    });
  });

  it('marks nothing when the passage is nowhere in the book', () => {
    expect(passageMark(THE_PASSAGE_IS_LOST, A_PAGE)).toEqual(NOTHING_ARRIVED_AT);
  });

  it('marks nothing when the passage arrived at carries no cfi', () => {
    expect(passageMark(arrivedAtTheCfi(''), A_PAGE)).toEqual(NOTHING_ARRIVED_AT);
  });
});

describe('markAfterMove', () => {
  it('keeps the mark while the reader stays on the page it landed on', () => {
    const mark = jumpedTo(FIRST);

    expect(markAfterMove(mark, A_PAGE)).toBe(mark);
  });

  it('drops the mark when the reader turns the page', () => {
    expect(markAfterMove(jumpedTo(FIRST), ANOTHER_PAGE)).toEqual(NOTHING_ARRIVED_AT);
  });

  it('drops the mark when the page it landed on was never reported', () => {
    expect(markAfterMove(jumpedTo(FIRST, null), A_PAGE)).toEqual(NOTHING_ARRIVED_AT);
  });

  it('leaves an unmarked book unmarked', () => {
    expect(markAfterMove(NOTHING_ARRIVED_AT, A_PAGE)).toEqual(NOTHING_ARRIVED_AT);
  });
});

describe('highlightChange', () => {
  it('adds a passage that is not drawn yet', () => {
    expect(
      highlightChange(drawn({ [FIRST]: 'ordinary' }), [FIRST, SECOND], NOTHING_ARRIVED_AT),
    ).toEqual({
      added: [{ cfi: SECOND, weight: 'ordinary' }],
      removed: [],
    });
  });

  it('removes a passage whose capture is gone', () => {
    expect(
      highlightChange(
        drawn({ [FIRST]: 'ordinary', [SECOND]: 'ordinary' }),
        [SECOND],
        NOTHING_ARRIVED_AT,
      ),
    ).toEqual({ added: [], removed: [FIRST] });
  });

  it('leaves an unchanged passage alone', () => {
    expect(highlightChange(drawn({ [FIRST]: 'ordinary' }), [FIRST], NOTHING_ARRIVED_AT)).toEqual({
      added: [],
      removed: [],
    });
  });

  it('removes every passage when the reader clears the captures', () => {
    expect(
      highlightChange(drawn({ [FIRST]: 'ordinary', [SECOND]: 'ordinary' }), [], NOTHING_ARRIVED_AT),
    ).toEqual({ added: [], removed: [FIRST, SECOND] });
  });

  it('draws the passage jumped to again, now that it is marked', () => {
    expect(
      highlightChange(
        drawn({ [FIRST]: 'ordinary', [SECOND]: 'ordinary' }),
        [FIRST, SECOND],
        jumpedTo(FIRST),
      ),
    ).toEqual({ added: [{ cfi: FIRST, weight: 'arrived' }], removed: [] });
  });

  it('draws the passage jumped away from again, now that it is not', () => {
    expect(
      highlightChange(
        drawn({ [FIRST]: 'arrived', [SECOND]: 'ordinary' }),
        [FIRST, SECOND],
        NOTHING_ARRIVED_AT,
      ),
    ).toEqual({ added: [{ cfi: FIRST, weight: 'ordinary' }], removed: [] });
  });

  it('draws the marked passage even when no capture holds that cfi', () => {
    expect(highlightChange(drawn({}), [FIRST], jumpedTo(SECOND))).toEqual({
      added: [
        { cfi: FIRST, weight: 'ordinary' },
        { cfi: SECOND, weight: 'arrived' },
      ],
      removed: [],
    });
  });

  it('keeps the marked passage drawn when its capture is deleted', () => {
    expect(highlightChange(drawn({ [FIRST]: 'arrived' }), [], jumpedTo(FIRST))).toEqual({
      added: [],
      removed: [],
    });
  });
});
