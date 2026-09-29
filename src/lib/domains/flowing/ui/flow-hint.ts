import { match } from 'ts-pattern';
import { lessonKind } from '$lib/shared/guide-kind';
import type { GuideKind } from '$lib/shared/guide-kind';
import type { SwipeFinger } from '$lib/shared/page-turn';
import type { SwipeLesson } from '$lib/shared/swipe-lesson';
import type { BookPaging, TextDirection } from './flow-writing-mode';

type FlowInput = 'touch' | 'pointer';

type FlowGuidePlace = {
  readonly open: boolean;
  readonly input: FlowInput;
};

const VERTICAL_PAGES: SwipeLesson = { kind: 'vertical-pages' };

function flowInput(lastPointerType: string | null, coarse: boolean): FlowInput {
  if (lastPointerType === 'touch') return 'touch';
  if (lastPointerType === 'mouse' || lastPointerType === 'pen') return 'pointer';
  return coarse ? 'touch' : 'pointer';
}

function forwardFinger(direction: TextDirection): SwipeFinger {
  return match(direction)
    .with('ltr', (): SwipeFinger => 'left')
    .with('rtl', (): SwipeFinger => 'right')
    .exhaustive();
}

function flowSwipeLesson(paging: BookPaging): SwipeLesson {
  return match(paging)
    .with({ axis: 'vertical' }, () => VERTICAL_PAGES)
    .with({ axis: 'horizontal' }, ({ direction }): SwipeLesson => ({
      kind: 'sideways',
      forward: forwardFinger(direction),
    }))
    .exhaustive();
}

function offersFlowGuide(place: FlowGuidePlace): boolean {
  return place.open && place.input === 'touch';
}

function flowGuideKind(paging: BookPaging): GuideKind {
  return lessonKind(flowSwipeLesson(paging));
}

export { flowGuideKind, flowInput, flowSwipeLesson, forwardFinger, offersFlowGuide };
export type { FlowGuidePlace, FlowInput };
