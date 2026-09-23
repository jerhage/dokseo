import { match } from 'ts-pattern';
import type { Anchor } from '$lib/shared/anchor';
import type { PassageArrival } from './flow-quote';

type PassageWeight = 'ordinary' | 'arrived';

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

const NO_PASSAGES: readonly string[] = [];

const NO_ANCHORS: readonly Anchor[] = [];

const NOTHING_ARRIVED_AT: PassageMark = { kind: 'none' };

function passageCfis(anchors: readonly Anchor[]): readonly string[] {
  const wanted = new Set<string>();
  for (const anchor of anchors) {
    if (anchor.kind !== 'text') continue;
    if (anchor.cfi.length === 0) continue;

    wanted.add(anchor.cfi);
  }

  return [...wanted];
}

function arrivedAt(cfi: string, place: string | null): PassageMark {
  return cfi.length === 0 ? NOTHING_ARRIVED_AT : { kind: 'arrived', cfi, place };
}

function passageMark(arrival: PassageArrival, place: string | null): PassageMark {
  return match(arrival)
    .with({ kind: 'cfi' }, (at) => arrivedAt(at.cfi, place))
    .with({ kind: 'quote' }, (at) => arrivedAt(at.cfi, place))
    .with({ kind: 'lost' }, () => NOTHING_ARRIVED_AT)
    .exhaustive();
}

function markAfterMove(mark: PassageMark, place: string): PassageMark {
  if (mark.kind === 'none') return mark;

  return mark.place === place ? mark : NOTHING_ARRIVED_AT;
}

function passageWeight(cfi: string, mark: PassageMark): PassageWeight {
  return mark.kind === 'arrived' && mark.cfi === cfi ? 'arrived' : 'ordinary';
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
  NO_ANCHORS,
  NO_PASSAGES,
  NOTHING_ARRIVED_AT,
  PASSAGE_HIGHLIGHT_COLOUR,
  highlightChange,
  markAfterMove,
  passageCfis,
  passageMark,
  passageWeight,
  wantedPassages,
};
export type { DrawnPassage, HighlightChange, PassageMark, PassageWeight };
