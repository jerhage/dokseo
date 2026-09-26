import { match } from 'ts-pattern';
import type { ImageIndex } from '$lib/shared/ids';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { travelPastEdge } from '../domain/overscroll';
import type { PanReach } from '../domain/overscroll';
import type { PageGroup } from '../domain/page-pairing';
import { moveTowards } from './page-moves';
import type { PageMove } from './page-moves';
import type { TouchState } from './touch-gesture';

type Beside = -1 | 0 | 1;

type Neighbours = Readonly<Record<PageMove, PageGroup | null>>;

type SlideScene = {
  readonly width: number;
  readonly direction: ReadingDirection;
  readonly neighbours: Neighbours;
};

type Slide =
  | { readonly kind: 'rest' }
  | { readonly kind: 'follow'; readonly offset: number }
  | { readonly kind: 'settle'; readonly offset: number; readonly move: PageMove | null };

type SlidePane = { readonly key: ImageIndex; readonly pages: PageGroup; readonly beside: Beside };

const SLIDE_GAP_PX = 16;

const SLIDE_RESISTANCE = 0.55;

const SLIDE_REST: Slide = { kind: 'rest' };

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function besideOf(move: PageMove, direction: ReadingDirection): Beside {
  return moveTowards('right', 'paged', direction) === move ? 1 : -1;
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

function resisted(travel: number, width: number): number {
  const pulled = (Math.abs(travel) * SLIDE_RESISTANCE) / width;
  return Math.sign(travel) * (1 - 1 / (pulled + 1)) * width;
}

function slideOffset(travel: number, scene: SlideScene): number {
  if (!Number.isFinite(travel) || travel === 0 || !isPositiveFinite(scene.width)) return 0;

  const move = moveTowards(travel < 0 ? 'right' : 'left', 'paged', scene.direction);
  if (scene.neighbours[move] === null) return resisted(travel, scene.width);

  const reach = scene.width + SLIDE_GAP_PX;
  return Math.max(-reach, Math.min(reach, travel));
}

function isFollowing(state: TouchState): boolean {
  return state.kind === 'swiping' || state.kind === 'panning';
}

function slideEnd(offset: number, turn: PageMove | null, scene: SlideScene): Slide {
  if (offset === 0) return SLIDE_REST;
  if (turn === null || scene.neighbours[turn] === null) {
    return { kind: 'settle', offset: 0, move: null };
  }

  const across = scene.width + SLIDE_GAP_PX;
  return { kind: 'settle', offset: -besideOf(turn, scene.direction) * across, move: turn };
}

function slideStep(
  slide: Slide,
  state: TouchState,
  travel: number,
  turn: PageMove | null,
  scene: SlideScene,
): Slide {
  if (isFollowing(state) && slide.kind !== 'settle') {
    return { kind: 'follow', offset: slideOffset(travel, scene) };
  }

  return match<Slide, Slide>(slide)
    .with({ kind: 'rest' }, { kind: 'settle' }, () => slide)
    .with({ kind: 'follow' }, ({ offset }) => slideEnd(offset, turn, scene))
    .exhaustive();
}

function slideShift(slide: Slide): number {
  return slide.kind === 'rest' ? 0 : slide.offset;
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

export {
  SLIDE_GAP_PX,
  SLIDE_RESISTANCE,
  SLIDE_REST,
  besideOf,
  slideOffset,
  slidePanes,
  slideShift,
  slideStep,
  slideTravel,
};
export type { Beside, Neighbours, Slide, SlidePane, SlideScene };
