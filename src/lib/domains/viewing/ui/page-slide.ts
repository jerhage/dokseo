import { match } from 'ts-pattern';
import type { CarouselInput, CarouselSide } from '$lib/components/carousel';
import type { ImageIndex } from '$lib/shared/ids';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { travelPastEdge } from '../domain/overscroll';
import type { PanReach } from '../domain/overscroll';
import type { PageGroup } from '../domain/page-pairing';
import { moveTowards } from './page-moves';
import type { PageMove } from './page-moves';
import type { TouchState } from './touch-gesture';

type Beside = CarouselSide | 0;

type Neighbours = Readonly<Record<PageMove, PageGroup | null>>;

type SlidePane = { readonly key: ImageIndex; readonly pages: PageGroup; readonly beside: Beside };

function besideOf(move: PageMove, direction: ReadingDirection): CarouselSide {
  return moveTowards('right', 'paged', direction) === move ? 1 : -1;
}

function moveOf(side: CarouselSide, direction: ReadingDirection): PageMove {
  return besideOf('increment', direction) === side ? 'increment' : 'decrement';
}

function slideTravel(state: TouchState, reach: PanReach | null): number {
  return match(state)
    .with({ kind: 'swiping' }, ({ press }) => press.at.x - press.start.x)
    .with({ kind: 'panning' }, ({ press }) =>
      reach === null ? 0 : travelPastEdge(reach, press.at.x - press.start.x),
    )
    .with(
      { kind: 'idle' },
      { kind: 'pressed' },
      { kind: 'selecting' },
      { kind: 'pinching' },
      { kind: 'lifting' },
      () => 0,
    )
    .exhaustive();
}

function slideInput(
  state: TouchState,
  travel: number,
  turn: PageMove | null,
  direction: ReadingDirection,
): CarouselInput {
  if (state.kind === 'swiping' || state.kind === 'panning') return { kind: 'follow', travel };
  return { kind: 'release', towards: turn === null ? null : besideOf(turn, direction) };
}

function slidePanes(
  current: PageGroup,
  neighbours: Neighbours,
  direction: ReadingDirection,
): readonly SlidePane[] {
  const placed: readonly (readonly [PageGroup | null, Beside])[] = [
    [neighbours.decrement, besideOf('decrement', direction)],
    [current, 0],
    [neighbours.increment, besideOf('increment', direction)],
  ];

  return placed.flatMap(([pages, beside]) => {
    const key = pages?.[0];
    return pages === null || key === undefined ? [] : [{ key, pages, beside }];
  });
}

export { besideOf, moveOf, slideInput, slidePanes, slideTravel };
export type { Beside, Neighbours, SlidePane };
