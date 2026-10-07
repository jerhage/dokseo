import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import {
  ARRIVED_BORDER_WIDTH_PROPERTY,
  arrivedBorderWidth,
  joinedLines,
  highlightChange,
  markAfterMove,
  NOTHING_ARRIVED_AT,
  PASSAGE_HIGHLIGHT_COLOUR,
  askedPassages,
  drawnCfis,
  foundAt,
  passageColour,
  passagesToFind,
  SEEKING,
  passageMark,
  passageWeight,
} from './flow-highlight';
import type { LineRect } from './flow-highlight';
import type { FoundPassage, PassageMark, PassageWeight } from './flow-highlight';
import { REFLOWED, TRAVELLED } from './flow-move';
import {
  arrivedAtTheCfi,
  foundByItsText,
  foundForACollapsedCfi,
  THE_PASSAGE_IS_LOST,
} from './flow-quote';

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
  return textAnchor(cfi, QUOTE, null);
}

function onAPage(): Anchor {
  return regionAnchor([
    {
      index: imageIndex(13),
      rect: pageRect(0.01, 0.02, 0.1, 0.04),
    },
  ]);
}

describe('askedPassages', () => {
  it('draws one highlight for each passage lifted from the book', () => {
    expect(askedPassages([lifted(FIRST), lifted(SECOND)])).toEqual([
      { cfi: FIRST, quote: QUOTE },
      { cfi: SECOND, quote: QUOTE },
    ]);
  });

  it('draws nothing for a capture anchored to a region of a page image', () => {
    expect(askedPassages([onAPage(), lifted(FIRST)])).toEqual([{ cfi: FIRST, quote: QUOTE }]);
  });

  it('draws one highlight when two captures quote the same passage', () => {
    expect(askedPassages([lifted(FIRST), lifted(FIRST)])).toEqual([{ cfi: FIRST, quote: QUOTE }]);
  });

  it('draws nothing for a passage whose cfi was never recorded', () => {
    expect(askedPassages([lifted('')])).toEqual([]);
  });
});

describe('drawnCfis', () => {
  const COLLAPSED = 'epubcfi(/6/12!/4,/522,/522)';

  const REFOUND = 'epubcfi(/6/12!/4/522,/1:0,/1:44)';

  function found(entries: Readonly<Record<string, FoundPassage>>): Map<string, FoundPassage> {
    return new Map(Object.entries(entries));
  }

  it('draws a stored cfi that selects text as it is', () => {
    expect(drawnCfis([{ cfi: FIRST, quote: QUOTE }], found({}))).toEqual([FIRST]);
  });

  it('draws a collapsed cfi at the place its quote was found, and nowhere while it is sought or lost', () => {
    const asked = [{ cfi: COLLAPSED, quote: QUOTE }];

    expect(drawnCfis(asked, found({}))).toEqual([]);
    expect(drawnCfis(asked, found({ [COLLAPSED]: SEEKING }))).toEqual([]);
    expect(drawnCfis(asked, found({ [COLLAPSED]: foundAt(null) }))).toEqual([]);
    expect(drawnCfis(asked, found({ [COLLAPSED]: foundAt(REFOUND) }))).toEqual([REFOUND]);
  });

  it('seeks only the collapsed cfis not already sought', () => {
    const asked = [
      { cfi: FIRST, quote: QUOTE },
      { cfi: COLLAPSED, quote: QUOTE },
    ];

    expect(passagesToFind(asked, found({}))).toEqual([{ cfi: COLLAPSED, quote: QUOTE }]);
    expect(passagesToFind(asked, found({ [COLLAPSED]: SEEKING }))).toEqual([]);
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

describe('passageColour', () => {
  it.each(['arrived', 'ordinary', undefined] as const)(
    'washes a passage weighted %s in the capture yellow',
    (weight) => {
      expect(passageColour(weight)).toBe(PASSAGE_HIGHLIGHT_COLOUR);
    },
  );

  it('reads the ring width in pixels from the border width token', () => {
    const style = {
      getPropertyValue: (property: string) =>
        property === ARRIVED_BORDER_WIDTH_PROPERTY ? '2px' : '',
    };

    expect(ARRIVED_BORDER_WIDTH_PROPERTY).toBe('--border-width');
    expect(arrivedBorderWidth(style)).toBe(2);
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

  it('marks the fresh cfi when a collapsed cfi was found by its text', () => {
    expect(passageMark(foundForACollapsedCfi(SECOND), A_PAGE)).toEqual({
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
  it.each([
    ['travel', TRAVELLED],
    ['a reflow', REFLOWED],
  ])('keeps the mark unchanged when %s reports the page it landed on', (_cause, cause) => {
    const mark = jumpedTo(FIRST);

    expect(markAfterMove(mark, A_PAGE, cause)).toBe(mark);
  });

  it('drops the mark when the reader turns the page', () => {
    expect(markAfterMove(jumpedTo(FIRST), ANOTHER_PAGE, TRAVELLED)).toEqual(NOTHING_ARRIVED_AT);
  });

  it('drops the mark when the page it landed on was never reported', () => {
    expect(markAfterMove(jumpedTo(FIRST, null), A_PAGE, TRAVELLED)).toEqual(NOTHING_ARRIVED_AT);
  });

  it('keeps the mark when a reflow reports a different place, and remembers that place', () => {
    expect(markAfterMove(jumpedTo(FIRST), ANOTHER_PAGE, REFLOWED)).toEqual({
      kind: 'arrived',
      cfi: FIRST,
      place: ANOTHER_PAGE,
    });
  });

  it('keeps the mark when a reflow reports a place the jump never learned', () => {
    expect(markAfterMove(jumpedTo(FIRST, null), A_PAGE, REFLOWED)).toEqual({
      kind: 'arrived',
      cfi: FIRST,
      place: A_PAGE,
    });
  });

  it.each([
    ['a page turn', TRAVELLED],
    ['a reflow', REFLOWED],
  ])('leaves an unmarked book unmarked after %s', (_cause, cause) => {
    expect(markAfterMove(NOTHING_ARRIVED_AT, A_PAGE, cause)).toEqual(NOTHING_ARRIVED_AT);
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

  it.each([
    [[SECOND], [FIRST]],
    [[], [FIRST, SECOND]],
  ])('removes each passage whose capture is gone, keeping %j', (kept, removed) => {
    expect(
      highlightChange(
        drawn({ [FIRST]: 'ordinary', [SECOND]: 'ordinary' }),
        kept,
        NOTHING_ARRIVED_AT,
      ),
    ).toEqual({ added: [], removed });
  });

  it('leaves an unchanged passage alone', () => {
    expect(highlightChange(drawn({ [FIRST]: 'ordinary' }), [FIRST], NOTHING_ARRIVED_AT)).toEqual({
      added: [],
      removed: [],
    });
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

describe('joinedLines', () => {
  const column = (top: number, height: number): LineRect => ({
    left: 40,
    top,
    right: 70,
    bottom: top + height,
    width: 30,
    height,
  });

  it('joins the pieces a ruby splits one line into', () => {
    expect(joinedLines([column(10, 20), column(30, 12), column(42, 18)])).toEqual([column(10, 50)]);
  });

  it.each([
    ['in two columns', column(10, 20), { ...column(10, 20), left: 100, right: 130 }],
    ['in one column with a gap between them', column(10, 20), column(40, 20)],
  ])('leaves two separate lines %s separate', (_where, first, second) => {
    expect(joinedLines([first, second])).toEqual([first, second]);
  });
});
