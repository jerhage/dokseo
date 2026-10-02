import { describe, expect, it } from 'vitest';
import { flowGuideKind, flowInput, flowSwipeLesson, offersFlowGuide } from './flow-hint';

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
  it.each([
    [{ axis: 'vertical', mode: 'vertical-lr' }, 'vertical-pages'],
    [{ axis: 'horizontal', direction: 'ltr' }, 'swipe-left'],
    [{ axis: 'horizontal', direction: 'rtl' }, 'swipe-right'],
  ] as const)(
    'keys a book paged %j as %s, the kind an image book of that direction shares',
    (paging, kind) => {
      expect(flowGuideKind(paging)).toBe(kind);
    },
  );
});

describe('flowInput', () => {
  it('reads a touch as touch', () => {
    expect(flowInput('touch', false)).toBe('touch');
  });

  it.each(['mouse', 'pen'])('reads a %s on a touch screen as a pointer', (pointerType) => {
    expect(flowInput(pointerType, true)).toBe('pointer');
  });

  it('falls back to the coarse pointer media query before any press', () => {
    expect(flowInput(null, true)).toBe('touch');
    expect(flowInput(null, false)).toBe('pointer');
  });
});
