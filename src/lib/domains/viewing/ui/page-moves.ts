import { match } from 'ts-pattern';
import type { LayoutKind, ReadingDirection } from '$lib/shared/layout-kind';

export type PageMove = 'decrement' | 'increment';

const DECREMENT_FIRST: readonly PageMove[] = ['decrement', 'increment'];
const INCREMENT_FIRST: readonly PageMove[] = ['increment', 'decrement'];

export function moveOrder(
  layoutKind: LayoutKind,
  direction: ReadingDirection,
): readonly PageMove[] {
  return match(layoutKind)
    .with('paged', () => (direction === 'rtl' ? INCREMENT_FIRST : DECREMENT_FIRST))
    .with('continuous', () => DECREMENT_FIRST)
    .exhaustive();
}
