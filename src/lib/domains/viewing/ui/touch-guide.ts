import { match } from 'ts-pattern';
import { lessonKind } from '$lib/shared/guide-kind';
import type { GuideKind } from '$lib/shared/guide-kind';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { swipedSide } from '$lib/shared/page-turn';
import type { SwipeFinger, TouchTurns } from '$lib/shared/page-turn';
import type { SwipeLesson } from '$lib/shared/swipe-lesson';
import type { InputKind } from './gesture-hint';
import { moveTowards } from './page-moves';
import { zoneLabels } from './zone-overlay';
import type { ZoneLabel } from './zone-overlay';

type PagedGuide = {
  readonly kind: GuideKind;
  readonly zones: readonly ZoneLabel[];
  readonly swipe: SwipeLesson;
};

const NO_ZONES: readonly ZoneLabel[] = [];

const STRIP_GUIDE: SwipeLesson = { kind: 'vertical-scroll' };

const STRIP_GUIDE_KIND: GuideKind = lessonKind(STRIP_GUIDE);

function offersTouchGuide(input: InputKind): boolean {
  return input === 'touch';
}

function forwardSwipe(direction: ReadingDirection): SwipeFinger {
  return match(moveTowards(swipedSide('left'), 'paged', direction))
    .with('increment', (): SwipeFinger => 'left')
    .with('decrement', (): SwipeFinger => 'right')
    .exhaustive();
}

function pagedGuide(turns: TouchTurns, direction: ReadingDirection): PagedGuide {
  const swipe: SwipeLesson = { kind: 'sideways', forward: forwardSwipe(direction) };
  return match(turns)
    .with('tap-zones', (): PagedGuide => ({
      kind: 'tap-zones',
      zones: zoneLabels(direction),
      swipe,
    }))
    .with('swipe-only', (): PagedGuide => ({ kind: lessonKind(swipe), zones: NO_ZONES, swipe }))
    .exhaustive();
}

export { STRIP_GUIDE, STRIP_GUIDE_KIND, forwardSwipe, offersTouchGuide, pagedGuide };
export type { PagedGuide };
