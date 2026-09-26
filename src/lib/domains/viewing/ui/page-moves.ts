import { match } from 'ts-pattern';
import type { ImageLayoutKind, ReadingDirection } from '$lib/shared/layout-kind';
import { towards } from '$lib/shared/page-turn';
import type { TurnSide } from '$lib/shared/page-turn';

type PageMove = 'decrement' | 'increment';

type MoveOrder = readonly [PageMove, PageMove];

const DECREMENT_FIRST: MoveOrder = ['decrement', 'increment'];
const INCREMENT_FIRST: MoveOrder = ['increment', 'decrement'];

function moveOrder(layoutKind: ImageLayoutKind, direction: ReadingDirection): MoveOrder {
  return match(layoutKind)
    .with('paged', () => (direction === 'rtl' ? INCREMENT_FIRST : DECREMENT_FIRST))
    .with('continuous', () => DECREMENT_FIRST)
    .exhaustive();
}

function moveTowards(
  side: TurnSide,
  layoutKind: ImageLayoutKind,
  direction: ReadingDirection,
): PageMove {
  return towards(side, moveOrder(layoutKind, direction));
}

export { moveOrder, moveTowards };
export type { PageMove };
