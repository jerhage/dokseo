import { describe, expect, it } from 'vitest';
import { opensMenuByKey, pointerPlacement } from './context-menu';
import type { OverlaySize, Viewport } from './overlay-placement';

const DESKTOP: Viewport = { width: 1440, height: 900 };

const MENU: OverlaySize = { width: 200, height: 160 };

function corner(x: number, y: number, direction: 'ltr' | 'rtl' = 'ltr') {
  const { top, left } = pointerPlacement({ x, y }, DESKTOP, MENU, 8, direction);
  return { top, left };
}

describe('pointerPlacement', () => {
  it('puts the top-left corner of the menu at the pointer', () => {
    expect(corner(300, 200)).toEqual({ top: 200, left: 300 });
  });

  it('opens to the left of the pointer when the menu would cross the right edge', () => {
    expect(corner(1300, 200).left).toBe(1100);
  });

  it('opens above the pointer when the menu would cross the bottom edge', () => {
    expect(corner(300, 800).top).toBe(640);
  });

  it('opens to the left of the pointer in right-to-left text, and to the right when that crosses the left edge', () => {
    expect([corner(600, 200, 'rtl').left, corner(100, 200, 'rtl').left]).toEqual([400, 100]);
  });

  it('keeps the menu an edge inside a viewport too small for it on either side', () => {
    const phone: Viewport = { width: 300, height: 200 };

    expect(pointerPlacement({ x: 150, y: 100 }, phone, MENU, 8, 'ltr')).toMatchObject({
      top: 8,
      left: 8,
    });
  });

  it('reports the widest the menu may be: the viewport less two edges', () => {
    expect(pointerPlacement({ x: 0, y: 0 }, DESKTOP, MENU, 8, 'ltr').maxWidth).toBe(1424);
  });
});

describe('opensMenuByKey', () => {
  it('opens on the ContextMenu key and on Shift+F10, and on nothing else', () => {
    expect([
      opensMenuByKey('ContextMenu', false),
      opensMenuByKey('F10', true),
      opensMenuByKey('F10', false),
      opensMenuByKey('Enter', true),
    ]).toEqual([true, true, false, false]);
  });
});
