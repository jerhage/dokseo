import { describe, expect, it } from 'vitest';
import { TOUCH_GUIDE_LABEL, dueAfter, isGuideKind, lessonKind, showsGuide } from './guide-kind';
import type { GuideKind, GuideMoment } from './guide-kind';
import type { SwipeLesson } from './swipe-lesson';

describe('lessonKind', () => {
  it.each<[string, SwipeLesson, GuideKind]>([
    ['a guide that teaches a left swipe', { kind: 'sideways', forward: 'left' }, 'swipe-left'],
    ['a guide that teaches a right swipe', { kind: 'sideways', forward: 'right' }, 'swipe-right'],
    ['vertical pages', { kind: 'vertical-pages' }, 'vertical-pages'],
    ['the strip scroll', { kind: 'vertical-scroll' }, 'strip-scroll'],
  ])('keys %s as its guide kind', (_name, lesson, kind) => {
    expect(lessonKind(lesson)).toBe(kind);
  });
});

describe('dueAfter', () => {
  it.each<[string, GuideMoment, boolean]>([
    [
      'shows the guide of a kind not yet seen when a book opens',
      { kind: 'opened', seen: false },
      true,
    ],
    ['keeps a seen kind hidden when a book opens', { kind: 'opened', seen: true }, false],
    ['shows the guide the reader asked for, even of a seen kind', { kind: 'recalled' }, true],
    ['ends the guide when it is dismissed', { kind: 'dismissed' }, false],
  ])('%s', (_name, moment, due) => {
    expect(dueAfter(moment)).toBe(due);
  });
});

describe('showsGuide', () => {
  it.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
  ])('decides that a guide offered %s and due %s shows: %s', (offered, due, shown) => {
    expect(showsGuide({ offered, due })).toBe(shown);
  });
});

describe('TOUCH_GUIDE_LABEL', () => {
  it('names the button that shows the guide again', () => {
    expect(TOUCH_GUIDE_LABEL).toBe('Show the touch guide');
  });
});

describe('isGuideKind', () => {
  it('accepts every guide kind and rejects anything else a stale store holds', () => {
    for (const kind of [
      'swipe-left',
      'swipe-right',
      'tap-zones',
      'strip-scroll',
      'vertical-pages',
    ]) {
      expect(isGuideKind(kind)).toBe(true);
    }
    expect(isGuideKind('zones')).toBe(false);
  });
});
