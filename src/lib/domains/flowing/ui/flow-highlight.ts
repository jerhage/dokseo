import { match } from 'ts-pattern';
import { pixelLength } from '$lib/ui/components/css-length';
import type { StyleSource } from '$lib/ui/components/css-length';
import type { Anchor, TextQuote } from '$lib/shared/anchor';
import { collapsedCfi } from './flow-cfi';
import type { MoveCause } from './flow-move';
import type { PassageArrival } from './flow-quote';

type PassageWeight = 'ordinary' | 'arrived';

type AskedPassage = {
  readonly cfi: string;
  readonly quote: TextQuote;
};

type FoundPassage =
  | { readonly kind: 'seeking' }
  | { readonly kind: 'found'; readonly cfi: string }
  | { readonly kind: 'lost' };

type PassageMark =
  | { readonly kind: 'none' }
  | { readonly kind: 'arrived'; readonly cfi: string; readonly place: string | null };

type DrawnPassage = {
  readonly cfi: string;
  readonly weight: PassageWeight;
};

type HighlightChange = {
  readonly added: readonly DrawnPassage[];
  readonly removed: readonly string[];
};

const PASSAGE_HIGHLIGHT_COLOUR = '#e3c34d';

const ARRIVED_BORDER_WIDTH_PROPERTY = '--border-width';

const NO_PASSAGES: readonly string[] = [];

const NO_ASKED_PASSAGES: readonly AskedPassage[] = [];

const SEEKING: FoundPassage = { kind: 'seeking' };

const LOST: FoundPassage = { kind: 'lost' };

const NO_ANCHORS: readonly Anchor[] = [];

const NOTHING_ARRIVED_AT: PassageMark = { kind: 'none' };

function arrivedBorderWidth(style: StyleSource): number {
  return pixelLength(style, ARRIVED_BORDER_WIDTH_PROPERTY);
}

function askedPassages(anchors: readonly Anchor[]): readonly AskedPassage[] {
  const wanted = new Map<string, AskedPassage>();
  for (const anchor of anchors) {
    if (anchor.kind !== 'text') continue;
    if (anchor.cfi.length === 0) continue;
    if (wanted.has(anchor.cfi)) continue;

    wanted.set(anchor.cfi, { cfi: anchor.cfi, quote: anchor.quote });
  }

  return [...wanted.values()];
}

function foundCfi(found: FoundPassage | undefined): string | null {
  if (found === undefined) return null;

  return match(found)
    .with({ kind: 'found' }, (at) => at.cfi)
    .with({ kind: 'seeking' }, { kind: 'lost' }, () => null)
    .exhaustive();
}

function drawnCfis(
  asked: readonly AskedPassage[],
  found: ReadonlyMap<string, FoundPassage>,
): readonly string[] {
  const drawn = new Set<string>();
  for (const passage of asked) {
    const cfi = collapsedCfi(passage.cfi) ? foundCfi(found.get(passage.cfi)) : passage.cfi;
    if (cfi !== null) drawn.add(cfi);
  }

  return [...drawn];
}

function passagesToFind(
  asked: readonly AskedPassage[],
  found: ReadonlyMap<string, FoundPassage>,
): readonly AskedPassage[] {
  return asked.filter((passage) => collapsedCfi(passage.cfi) && !found.has(passage.cfi));
}

function foundAt(cfi: string | null): FoundPassage {
  return cfi === null ? LOST : { kind: 'found', cfi };
}

function arrivedAt(cfi: string, place: string | null): PassageMark {
  return cfi.length === 0 ? NOTHING_ARRIVED_AT : { kind: 'arrived', cfi, place };
}

function passageMark(arrival: PassageArrival, place: string | null): PassageMark {
  return match(arrival)
    .with({ kind: 'cfi' }, (at) => arrivedAt(at.cfi, place))
    .with({ kind: 'quote' }, (at) => arrivedAt(at.cfi, place))
    .with({ kind: 'collapsed-cfi' }, (at) => arrivedAt(at.cfi, place))
    .with({ kind: 'lost' }, () => NOTHING_ARRIVED_AT)
    .exhaustive();
}

function markAfterMove(mark: PassageMark, place: string, cause: MoveCause): PassageMark {
  if (mark.kind === 'none') return mark;
  if (mark.place === place) return mark;

  return match(cause)
    .with({ kind: 'travel' }, () => NOTHING_ARRIVED_AT)
    .with({ kind: 'reflow' }, () => ({ ...mark, place }))
    .exhaustive();
}

function passageWeight(cfi: string, mark: PassageMark): PassageWeight {
  return mark.kind === 'arrived' && mark.cfi === cfi ? 'arrived' : 'ordinary';
}

type LineRect = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
};

const SAME_LINE_TOLERANCE_PX = 2;

function near(one: number, other: number): boolean {
  return Math.abs(one - other) <= SAME_LINE_TOLERANCE_PX;
}

function sharesALine(one: LineRect, other: LineRect): boolean {
  const column = near(one.left, other.left) && near(one.width, other.width);
  const row = near(one.top, other.top) && near(one.height, other.height);

  return column || row;
}

function touches(one: LineRect, other: LineRect): boolean {
  const apart = Math.max(
    one.left - other.right,
    other.left - one.right,
    one.top - other.bottom,
    other.top - one.bottom,
  );

  return apart <= SAME_LINE_TOLERANCE_PX;
}

function union(one: LineRect, other: LineRect): LineRect {
  const left = Math.min(one.left, other.left);
  const top = Math.min(one.top, other.top);
  const right = Math.max(one.right, other.right);
  const bottom = Math.max(one.bottom, other.bottom);

  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function joinedLines(rects: readonly LineRect[]): readonly LineRect[] {
  const joined: LineRect[] = [];
  for (const rect of rects) {
    const mate = joined.find((held) => sharesALine(held, rect) && touches(held, rect));
    if (mate === undefined) joined.push(rect);
    else joined[joined.indexOf(mate)] = union(mate, rect);
  }

  return joined;
}

function passageColour(weight: PassageWeight | undefined): string {
  return match(weight)
    .with('arrived', () => PASSAGE_HIGHLIGHT_COLOUR)
    .with('ordinary', () => PASSAGE_HIGHLIGHT_COLOUR)
    .with(undefined, () => PASSAGE_HIGHLIGHT_COLOUR)
    .exhaustive();
}

function wantedPassages(
  asked: readonly string[],
  mark: PassageMark,
): ReadonlyMap<string, PassageWeight> {
  const drawable = mark.kind === 'arrived' ? [...asked, mark.cfi] : asked;
  const wanted = new Map<string, PassageWeight>();
  for (const cfi of drawable) wanted.set(cfi, passageWeight(cfi, mark));

  return wanted;
}

function highlightChange(
  drawn: ReadonlyMap<string, PassageWeight>,
  asked: readonly string[],
  mark: PassageMark,
): HighlightChange {
  const wanted = wantedPassages(asked, mark);
  const added: DrawnPassage[] = [];
  for (const [cfi, weight] of wanted) {
    if (drawn.get(cfi) !== weight) added.push({ cfi, weight });
  }

  return { added, removed: [...drawn.keys()].filter((cfi) => !wanted.has(cfi)) };
}

export {
  ARRIVED_BORDER_WIDTH_PROPERTY,
  NO_ASKED_PASSAGES,
  SEEKING,
  arrivedAt,
  askedPassages,
  drawnCfis,
  foundAt,
  arrivedBorderWidth,
  joinedLines,
  NO_ANCHORS,
  NO_PASSAGES,
  NOTHING_ARRIVED_AT,
  PASSAGE_HIGHLIGHT_COLOUR,
  highlightChange,
  markAfterMove,
  passageColour,
  passagesToFind,
  passageMark,
  passageWeight,
  wantedPassages,
};
export type {
  AskedPassage,
  DrawnPassage,
  FoundPassage,
  HighlightChange,
  LineRect,
  PassageMark,
  PassageWeight,
};
