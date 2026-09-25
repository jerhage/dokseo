import { describe, expect, it } from 'vitest';
import { menuInset, menuPlacement } from './menu-placement';
import type { AnchorRect, MenuRequest, MenuSize, Viewport } from './menu-placement';

const VIEWPORT: Viewport = { width: 800, height: 600 };

const MENU: MenuSize = { width: 200, height: 200 };

const START_LTR: MenuRequest = { align: 'start', direction: 'ltr', gutter: 4 };

const END_LTR: MenuRequest = { align: 'end', direction: 'ltr', gutter: 4 };

const START_RTL: MenuRequest = { align: 'start', direction: 'rtl', gutter: 4 };

const END_RTL: MenuRequest = { align: 'end', direction: 'rtl', gutter: 4 };

const NEAR_TOP: AnchorRect = { top: 100, bottom: 132, left: 40, right: 160 };

const NEAR_BOTTOM: AnchorRect = { top: 500, bottom: 532, left: 40, right: 160 };

const LEFT_EDGE: AnchorRect = { top: 100, bottom: 132, left: 10, right: 90 };

const RIGHT_EDGE: AnchorRect = { top: 100, bottom: 132, left: 710, right: 790 };

const MIDDLE: AnchorRect = { top: 100, bottom: 132, left: 300, right: 420 };

function inline(anchor: AnchorRect, menu: MenuSize, request: MenuRequest) {
  const { align, left, right } = menuPlacement(anchor, VIEWPORT, menu, request);
  return { align, left, right };
}

describe('menuPlacement', () => {
  it('opens below the trigger when the menu fits there', () => {
    expect(menuPlacement(NEAR_TOP, VIEWPORT, MENU, START_LTR).block).toEqual({
      side: 'below',
      top: 132,
    });
  });

  it('opens above the trigger when the menu overflows below and there is more room above', () => {
    expect(menuPlacement(NEAR_BOTTOM, VIEWPORT, MENU, START_LTR).block).toEqual({
      side: 'above',
      bottom: 100,
    });
  });

  it('stays below when the menu fits exactly in the room below', () => {
    const exact: MenuSize = { width: 200, height: 68 };

    expect(menuPlacement(NEAR_BOTTOM, VIEWPORT, exact, START_LTR).block.side).toBe('below');
  });

  it('stays below when the menu overflows both sides and there is more room below', () => {
    const middle: AnchorRect = { top: 250, bottom: 282, left: 40, right: 160 };
    const tall: MenuSize = { width: 200, height: 400 };

    expect(menuPlacement(middle, VIEWPORT, tall, START_LTR).block).toEqual({
      side: 'below',
      top: 282,
    });
  });

  it('reports the trigger width so the menu can be at least as wide', () => {
    expect(menuPlacement(NEAR_TOP, VIEWPORT, MENU, START_LTR).anchorWidth).toBe(120);
  });

  it('caps the menu width at the viewport less a gutter on each side', () => {
    expect(menuPlacement(NEAR_TOP, VIEWPORT, MENU, START_LTR).maxWidth).toBe(792);
  });

  it('lines a start menu up with the left of the trigger in left-to-right text', () => {
    expect(inline(MIDDLE, MENU, START_LTR)).toEqual({ align: 'start', left: 300, right: 300 });
  });

  it('lines an end menu up with the right of the trigger in left-to-right text', () => {
    expect(inline(MIDDLE, MENU, END_LTR)).toEqual({ align: 'end', left: 220, right: 380 });
  });

  it('lines a start menu up with the right of the trigger in right-to-left text', () => {
    expect(inline(MIDDLE, MENU, START_RTL)).toEqual({ align: 'start', left: 220, right: 380 });
  });

  it('lines an end menu up with the left of the trigger in right-to-left text', () => {
    expect(inline(MIDDLE, MENU, END_RTL)).toEqual({ align: 'end', left: 300, right: 300 });
  });

  it('keeps an end menu that fits exactly against the left edge', () => {
    const flush: AnchorRect = { top: 100, bottom: 132, left: 0, right: 200 };

    expect(inline(flush, MENU, END_LTR)).toEqual({ align: 'end', left: 0, right: 600 });
  });

  it('keeps a start menu that fits exactly against the right edge', () => {
    const flush: AnchorRect = { top: 100, bottom: 132, left: 600, right: 700 };

    expect(inline(flush, MENU, START_LTR)).toEqual({ align: 'start', left: 600, right: 0 });
  });

  it('flips an end menu to the start when it would open past the left edge', () => {
    expect(inline(LEFT_EDGE, MENU, END_LTR)).toEqual({ align: 'start', left: 10, right: 590 });
  });

  it('flips a start menu to the end when it would open past the right edge', () => {
    expect(inline(RIGHT_EDGE, MENU, START_LTR)).toEqual({ align: 'end', left: 590, right: 10 });
  });

  it('flips a start menu to the end when it would open past the left edge in right-to-left text', () => {
    expect(inline(LEFT_EDGE, MENU, START_RTL)).toEqual({ align: 'end', left: 10, right: 590 });
  });

  it('flips an end menu to the start when it would open past the right edge in right-to-left text', () => {
    expect(inline(RIGHT_EDGE, MENU, END_RTL)).toEqual({ align: 'start', left: 590, right: 10 });
  });

  it('measures the menu at least as wide as its trigger before deciding whether it fits', () => {
    const wide: AnchorRect = { top: 100, bottom: 132, left: 500, right: 750 };

    expect(inline(wide, MENU, START_LTR)).toEqual({ align: 'start', left: 500, right: 50 });
  });

  it('shifts a menu that fits neither way just far enough to sit inside the gutter', () => {
    const broad: MenuSize = { width: 700, height: 200 };

    expect(inline(MIDDLE, broad, START_LTR)).toEqual({ align: 'start', left: 96, right: 4 });
  });

  it('holds a menu that fits neither way off the left edge by the gutter', () => {
    const broad: MenuSize = { width: 700, height: 200 };

    expect(inline(MIDDLE, broad, END_LTR)).toEqual({ align: 'end', left: 4, right: 96 });
  });

  it('pins a menu wider than the viewport inside both gutters', () => {
    const huge: MenuSize = { width: 1000, height: 200 };

    expect(inline(MIDDLE, huge, END_RTL)).toEqual({ align: 'end', left: 4, right: 4 });
  });
});

describe('menuInset', () => {
  it('sets the top and leaves the bottom to the stylesheet below the trigger', () => {
    const inset = menuInset(menuPlacement(NEAR_TOP, VIEWPORT, MENU, START_LTR));

    expect(inset).toEqual({
      top: '132px',
      bottom: undefined,
      left: '40px',
      right: '560px',
      anchorWidth: '120px',
      maxWidth: '792px',
    });
  });

  it('sets the bottom and leaves the top to the stylesheet above the trigger', () => {
    const inset = menuInset(menuPlacement(NEAR_BOTTOM, VIEWPORT, MENU, START_LTR));

    expect([inset.top, inset.bottom]).toEqual([undefined, '100px']);
  });

  it('sets nothing before the menu has been placed', () => {
    expect(Object.values(menuInset(undefined))).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});
