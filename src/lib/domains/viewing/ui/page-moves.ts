import { match } from 'ts-pattern';
import type { ImageLayoutKind, ReadingDirection } from '$lib/shared/layout-kind';

type PageMove = 'decrement' | 'increment';

const DECREMENT_FIRST: readonly PageMove[] = ['decrement', 'increment'];
const INCREMENT_FIRST: readonly PageMove[] = ['increment', 'decrement'];

function moveOrder(layoutKind: ImageLayoutKind, direction: ReadingDirection): readonly PageMove[] {
  return match(layoutKind)
    .with('paged', () => (direction === 'rtl' ? INCREMENT_FIRST : DECREMENT_FIRST))
    .with('continuous', () => DECREMENT_FIRST)
    .exhaustive();
}

export { moveOrder };
export type { PageMove };
