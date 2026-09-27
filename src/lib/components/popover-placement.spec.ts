import { describe, expect, it } from 'vitest';
import { popoverPlacement } from './popover-placement';
import type { AnchorRect, MenuSize, Viewport } from './menu-placement';

const PHONE: Viewport = { width: 390, height: 844 };

const SHEET: MenuSize = { width: 374, height: 350 };

function trigger(left: number, top: number): AnchorRect {
  return { top, bottom: top + 32, left, right: left + 32 };
}

describe('popoverPlacement', () => {
  it('places the popover below the trigger, one gap down, at its left edge', () => {
    expect(popoverPlacement(trigger(8, 100), { width: 1440, height: 900 }, SHEET)).toEqual({
      top: 140,
      left: 8,
    });
  });

  it('flips above the trigger when the space below cannot hold the popover and its gaps', () => {
    const anchor = trigger(8, 450);
    const below = PHONE.height - anchor.bottom;

    expect(below).toBeGreaterThanOrEqual(SHEET.height);
    expect(popoverPlacement(anchor, PHONE, SHEET)).toEqual({ top: 92, left: 8 });
  });

  it('stays below when there is more room below than above, and keeps an edge gap at the bottom', () => {
    expect(popoverPlacement(trigger(8, 250), { width: 390, height: 600 }, SHEET)).toEqual({
      top: 242,
      left: 8,
    });
  });

  it('keeps an edge gap at the top when the flipped popover would pass the viewport top', () => {
    expect(popoverPlacement(trigger(8, 300), { width: 390, height: 600 }, SHEET).top).toBe(8);
  });

  it('shifts the popover left so its right side keeps the edge gap', () => {
    expect(popoverPlacement(trigger(200, 100), PHONE, SHEET).left).toBe(8);
    expect(popoverPlacement(trigger(418, 100), { width: 760, height: 700 }, SHEET).left).toBe(378);
  });

  it('keeps the edge gap at the left side when the trigger starts closer to it', () => {
    expect(popoverPlacement(trigger(2, 100), PHONE, SHEET).left).toBe(8);
  });
});
