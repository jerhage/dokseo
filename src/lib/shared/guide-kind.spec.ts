import { describe, expect, it } from 'vitest';
import { TOUCH_GUIDE_LABEL, dueAfter, isGuideKind, lessonKind, showsGuide } from './guide-kind';

describe('lessonKind', () => {
  it('keys a guide that teaches a left swipe as swipe-left', () => {
    expect(lessonKind({ kind: 'sideways', forward: 'left' })).toBe('swipe-left');
  });

  it('keys a guide that teaches a right swipe as swipe-right', () => {
    expect(lessonKind({ kind: 'sideways', forward: 'right' })).toBe('swipe-right');
  });

  it('keys vertical pages as vertical-pages', () => {
    expect(lessonKind({ kind: 'vertical-pages' })).toBe('vertical-pages');
  });

  it('keys the strip scroll as strip-scroll', () => {
    expect(lessonKind({ kind: 'vertical-scroll' })).toBe('strip-scroll');
  });
});

describe('dueAfter', () => {
  it('shows the guide of a kind not yet seen when a book opens', () => {
    expect(dueAfter({ kind: 'opened', seen: false })).toBe(true);
  });

  it('keeps a seen kind hidden when a book opens', () => {
    expect(dueAfter({ kind: 'opened', seen: true })).toBe(false);
  });

  it('shows the guide the reader asked for, even of a seen kind', () => {
    expect(dueAfter({ kind: 'recalled' })).toBe(true);
  });

  it('ends the guide when it is dismissed', () => {
    expect(dueAfter({ kind: 'dismissed' })).toBe(false);
  });
});

describe('showsGuide', () => {
  it('shows a due guide where one is offered', () => {
    expect(showsGuide({ offered: true, due: true })).toBe(true);
  });

  it('shows nothing when the guide is not due', () => {
    expect(showsGuide({ offered: true, due: false })).toBe(false);
  });

  it('shows nothing where no guide is offered', () => {
    expect(showsGuide({ offered: false, due: true })).toBe(false);
  });
});

describe('TOUCH_GUIDE_LABEL', () => {
  it('names the button that shows the guide again', () => {
    expect(TOUCH_GUIDE_LABEL).toBe('Show the touch guide');
  });
});

describe('isGuideKind', () => {
  it('accepts every guide kind', () => {
    for (const kind of [
      'swipe-left',
      'swipe-right',
      'tap-zones',
      'strip-scroll',
      'vertical-pages',
    ]) {
      expect(isGuideKind(kind)).toBe(true);
    }
  });

  it('rejects anything else a stale store holds', () => {
    expect(isGuideKind('zones')).toBe(false);
  });
});
