import { match } from 'ts-pattern';
import type { SwipeFinger } from './page-turn';

type SwipeLesson =
  | { readonly kind: 'sideways'; readonly forward: SwipeFinger }
  | { readonly kind: 'vertical-pages' }
  | { readonly kind: 'vertical-scroll' };

type SwipeArrow = 'left' | 'right' | 'up-down';

type SwipeLine = { readonly text: string; readonly arrow: SwipeArrow };

function swipeLine(lesson: SwipeLesson): SwipeLine {
  return match(lesson)
    .with({ kind: 'sideways' }, ({ forward }) => ({
      text: `Swipe ${forward} for the next page`,
      arrow: forward,
    }))
    .with({ kind: 'vertical-pages' }, () => ({
      text: 'Swipe up or down to turn the page',
      arrow: 'up-down' as const,
    }))
    .with({ kind: 'vertical-scroll' }, () => ({
      text: 'Swipe up or down to scroll',
      arrow: 'up-down' as const,
    }))
    .exhaustive();
}

export { swipeLine };
export type { SwipeArrow, SwipeLesson, SwipeLine };
