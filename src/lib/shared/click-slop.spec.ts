import { describe, expect, it } from 'vitest';
import { CLICK_SLOP_PX, TOUCH_SLOP_PX, clickSlop } from './click-slop';

describe('clickSlop', () => {
  it('forgives a finger the twelve pixels it drifts while tapping', () => {
    expect(clickSlop('touch')).toBe(TOUCH_SLOP_PX);
    expect(TOUCH_SLOP_PX).toBe(12);
  });

  it('keeps the mouse to the three pixels of a steady hand', () => {
    expect(clickSlop('mouse')).toBe(CLICK_SLOP_PX);
    expect(CLICK_SLOP_PX).toBe(3);
  });

  it('holds a pen to the mouse slop, because a nib does not drift like a finger', () => {
    expect(clickSlop('pen')).toBe(CLICK_SLOP_PX);
  });

  it('treats an unknown pointer type as a mouse', () => {
    expect(clickSlop('')).toBe(CLICK_SLOP_PX);
  });
});
