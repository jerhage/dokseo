import { describe, expect, it } from 'vitest';
import { menuInset, menuPlacement } from './menu-placement';
import type { AnchorRect, Viewport } from './menu-placement';

const VIEWPORT: Viewport = { width: 800, height: 600 };

const NEAR_TOP: AnchorRect = { top: 100, bottom: 132, left: 40, right: 160 };

const NEAR_BOTTOM: AnchorRect = { top: 500, bottom: 532, left: 40, right: 160 };

describe('menuPlacement', () => {
  it('opens below the trigger when the menu fits there', () => {
    expect(menuPlacement(NEAR_TOP, VIEWPORT, 200).block).toEqual({ side: 'below', top: 132 });
  });

  it('opens above the trigger when the menu overflows below and there is more room above', () => {
    expect(menuPlacement(NEAR_BOTTOM, VIEWPORT, 200).block).toEqual({ side: 'above', bottom: 100 });
  });

  it('stays below when the menu fits exactly in the room below', () => {
    expect(menuPlacement(NEAR_BOTTOM, VIEWPORT, 68).block.side).toBe('below');
  });

  it('stays below when the menu overflows both sides and there is more room below', () => {
    const middle: AnchorRect = { top: 250, bottom: 282, left: 40, right: 160 };

    expect(menuPlacement(middle, VIEWPORT, 400).block).toEqual({ side: 'below', top: 282 });
  });

  it('measures the inline start from the left edge and the inline end from the right edge', () => {
    const placement = menuPlacement(NEAR_TOP, VIEWPORT, 200);

    expect([placement.left, placement.right]).toEqual([40, 640]);
  });

  it('reports the trigger width so the menu can be at least as wide', () => {
    expect(menuPlacement(NEAR_TOP, VIEWPORT, 200).anchorWidth).toBe(120);
  });
});

describe('menuInset', () => {
  it('sets the top and leaves the bottom to the stylesheet below the trigger', () => {
    const inset = menuInset(menuPlacement(NEAR_TOP, VIEWPORT, 200));

    expect(inset).toEqual({
      top: '132px',
      bottom: undefined,
      left: '40px',
      right: '640px',
      anchorWidth: '120px',
    });
  });

  it('sets the bottom and leaves the top to the stylesheet above the trigger', () => {
    const inset = menuInset(menuPlacement(NEAR_BOTTOM, VIEWPORT, 200));

    expect([inset.top, inset.bottom]).toEqual([undefined, '100px']);
  });

  it('sets nothing before the menu has been placed', () => {
    expect(Object.values(menuInset(undefined))).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});
