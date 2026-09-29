import { describe, expect, it } from 'vitest';
import {
  flowGuideKind,
  flowInput,
  flowSwipeLesson,
  forwardFinger,
  offersFlowGuide,
} from './flow-hint';

describe('offersFlowGuide', () => {
  it('offers the guide on touch in an open book', () => {
    expect(offersFlowGuide({ open: true, input: 'touch' })).toBe(true);
  });

  it('offers nothing before the book has opened', () => {
    expect(offersFlowGuide({ open: false, input: 'touch' })).toBe(false);
  });

  it('offers nothing to a mouse or a pen', () => {
    expect(offersFlowGuide({ open: true, input: 'pointer' })).toBe(false);
  });
});

describe('forwardFinger', () => {
  it('swipes left to go forward through left-to-right text', () => {
    expect(forwardFinger('ltr')).toBe('left');
  });

  it('swipes right to go forward through right-to-left text', () => {
    expect(forwardFinger('rtl')).toBe('right');
  });
});

describe('flowSwipeLesson', () => {
  it('teaches vertical text to swipe up or down', () => {
    expect(flowSwipeLesson({ axis: 'vertical', mode: 'vertical-rl' })).toEqual({
      kind: 'vertical-pages',
    });
  });

  it('teaches left-to-right text to swipe left', () => {
    expect(flowSwipeLesson({ axis: 'horizontal', direction: 'ltr' })).toEqual({
      kind: 'sideways',
      forward: 'left',
    });
  });

  it('teaches right-to-left text to swipe right', () => {
    expect(flowSwipeLesson({ axis: 'horizontal', direction: 'rtl' })).toEqual({
      kind: 'sideways',
      forward: 'right',
    });
  });
});

describe('flowGuideKind', () => {
  it('keys a vertical book as vertical-pages', () => {
    expect(flowGuideKind({ axis: 'vertical', mode: 'vertical-lr' })).toBe('vertical-pages');
  });

  it('keys left-to-right text as swipe-left, the kind an image book of that direction shares', () => {
    expect(flowGuideKind({ axis: 'horizontal', direction: 'ltr' })).toBe('swipe-left');
  });

  it('keys right-to-left text as swipe-right', () => {
    expect(flowGuideKind({ axis: 'horizontal', direction: 'rtl' })).toBe('swipe-right');
  });
});

describe('flowInput', () => {
  it('reads a touch as touch', () => {
    expect(flowInput('touch', false)).toBe('touch');
  });

  it('reads a mouse on a touch screen as a pointer', () => {
    expect(flowInput('mouse', true)).toBe('pointer');
  });

  it('reads a pen as a pointer', () => {
    expect(flowInput('pen', true)).toBe('pointer');
  });

  it('falls back to the coarse pointer media query before any press', () => {
    expect(flowInput(null, true)).toBe('touch');
    expect(flowInput(null, false)).toBe('pointer');
  });
});
