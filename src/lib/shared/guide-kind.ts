import { match } from 'ts-pattern';
import type { SwipeLesson } from './swipe-lesson';

type GuideKind = 'swipe-left' | 'swipe-right' | 'tap-zones' | 'strip-scroll' | 'vertical-pages';

type GuideMoment =
  | { readonly kind: 'opened'; readonly seen: boolean }
  | { readonly kind: 'recalled' }
  | { readonly kind: 'dismissed' };

type GuideScene = {
  readonly offered: boolean;
  readonly due: boolean;
};

const TOUCH_GUIDE_LABEL = 'Show the touch guide';

const GUIDE_KINDS = new Set<string>([
  'swipe-left',
  'swipe-right',
  'tap-zones',
  'strip-scroll',
  'vertical-pages',
]);

function isGuideKind(value: string): value is GuideKind {
  return GUIDE_KINDS.has(value);
}

function lessonKind(lesson: SwipeLesson): GuideKind {
  return match(lesson)
    .with({ kind: 'sideways', forward: 'left' }, (): GuideKind => 'swipe-left')
    .with({ kind: 'sideways', forward: 'right' }, (): GuideKind => 'swipe-right')
    .with({ kind: 'vertical-pages' }, (): GuideKind => 'vertical-pages')
    .with({ kind: 'vertical-scroll' }, (): GuideKind => 'strip-scroll')
    .exhaustive();
}

function dueAfter(moment: GuideMoment): boolean {
  return match(moment)
    .with({ kind: 'opened' }, ({ seen }) => !seen)
    .with({ kind: 'recalled' }, () => true)
    .with({ kind: 'dismissed' }, () => false)
    .exhaustive();
}

function showsGuide(scene: GuideScene): boolean {
  return scene.offered && scene.due;
}

export { TOUCH_GUIDE_LABEL, dueAfter, isGuideKind, lessonKind, showsGuide };
export type { GuideKind, GuideMoment, GuideScene };
