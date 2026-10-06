import { describe, expect, it } from 'vitest';
import {
  OVERLAY_EDGE_PROPERTY,
  OVERLAY_GAP_PROPERTY,
  hintPlacement,
  inlineDirection,
  menuInset,
  overlayPlacement,
  overlaySpacing,
} from './overlay-placement';
import type {
  AnchorRect,
  OverlayRequest,
  OverlaySize,
  OverlaySpacing,
  Viewport,
} from './overlay-placement';

const SPACING: OverlaySpacing = { gap: 4, edge: 8 };

const DESKTOP: Viewport = { width: 1440, height: 900 };

const PHONE: Viewport = { width: 390, height: 844 };

const CLASSIC_SCROLLBAR: Viewport = { width: 1425, height: 900 };

const MENU: OverlaySize = { width: 200, height: 200 };

const SHEET: OverlaySize = { width: 374, height: 350 };

const START_LTR: OverlayRequest = { align: 'start', direction: 'ltr', width: 'content' };

const END_LTR: OverlayRequest = { align: 'end', direction: 'ltr', width: 'content' };

const START_RTL: OverlayRequest = { align: 'start', direction: 'rtl', width: 'content' };

const END_RTL: OverlayRequest = { align: 'end', direction: 'rtl', width: 'content' };

const MIDDLE: AnchorRect = { top: 100, bottom: 132, left: 600, right: 720 };

function trigger(left: number, top: number): AnchorRect {
  return { top, bottom: top + 32, left, right: left + 32 };
}

function place(
  anchor: AnchorRect,
  viewport: Viewport,
  size: OverlaySize,
  request: OverlayRequest = START_LTR,
) {
  const { top, left } = overlayPlacement(anchor, viewport, size, request, SPACING);
  return { top, left };
}

describe('overlayPlacement', () => {
  it.each([
    ['a start overlay up with the left of the trigger in left-to-right text', START_LTR, 600],
    ['an end overlay up with the right of the trigger in left-to-right text', END_LTR, 520],
    ['a start overlay up with the right of the trigger in right-to-left text', START_RTL, 520],
    ['an end overlay up with the left of the trigger in right-to-left text', END_RTL, 600],
  ])('lines %s, one gap below it', (_case, request, left) => {
    expect(place(MIDDLE, DESKTOP, MENU, request)).toEqual({ top: 136, left });
  });

  it('flips above when the overlay alone fits below but its gap and the edge do not', () => {
    const anchor = trigger(600, 663);

    expect(place(anchor, DESKTOP, MENU).top).toBe(459);
  });

  it('stays below when the overlay, its gap and the edge fit exactly in the room below', () => {
    const anchor = trigger(600, 656);

    expect(place(anchor, DESKTOP, MENU).top).toBe(692);
  });

  it('stays below when the overlay overflows both sides and there is more room below, held off the bottom edge', () => {
    const short: Viewport = { width: 390, height: 600 };

    expect(place(trigger(8, 250), short, SHEET).top).toBe(242);
  });

  it('holds a flipped overlay off the top edge when it would pass the top of the viewport', () => {
    const short: Viewport = { width: 390, height: 600 };

    expect(place(trigger(8, 300), short, SHEET).top).toBe(8);
  });

  it('pins an overlay taller than the viewport to the top edge', () => {
    const tall: OverlaySize = { width: 200, height: 1000 };

    expect(place(MIDDLE, DESKTOP, tall).top).toBe(8);
  });

  it.each([
    [
      'a start overlay to the end when it would cross the right edge in left-to-right text',
      1340,
      START_LTR,
      1172,
    ],
    [
      'an end overlay to the start when it would cross the left edge in left-to-right text',
      20,
      END_LTR,
      20,
    ],
    [
      'a start overlay to the end when it would cross the left edge in right-to-left text',
      20,
      START_RTL,
      20,
    ],
    [
      'an end overlay to the start when it would cross the right edge in right-to-left text',
      1340,
      END_RTL,
      1172,
    ],
  ])('switches %s', (_case, x, request, left) => {
    expect(place(trigger(x, 100), DESKTOP, MENU, request).left).toBe(left);
  });

  it('keeps the requested alignment and clamps it when neither alignment fits', () => {
    const broad: OverlaySize = { width: 300, height: 200 };
    const anchor = trigger(150, 100);

    expect(place(anchor, PHONE, broad, START_LTR).left).toBe(82);
    expect(place(anchor, PHONE, broad, END_LTR).left).toBe(8);
    expect(place(anchor, PHONE, broad, START_RTL).left).toBe(8);
    expect(place(anchor, PHONE, broad, END_RTL).left).toBe(82);
  });

  it('keeps an overlay that fits exactly between the edge margins where the trigger puts it', () => {
    const flush: AnchorRect = { top: 100, bottom: 132, left: 1232, right: 1300 };

    expect(place(flush, DESKTOP, MENU).left).toBe(1232);
  });

  it('pins an overlay wider than the viewport inside both edge margins', () => {
    const huge: OverlaySize = { width: 2000, height: 200 };

    expect(place(MIDDLE, DESKTOP, huge, END_RTL).left).toBe(8);
  });

  it('measures the overlay at least as wide as its trigger when asked, and at its own width otherwise', () => {
    const wide: AnchorRect = { top: 100, bottom: 132, left: 1100, right: 1440 };
    const request: OverlayRequest = { align: 'start', direction: 'ltr', width: 'at-least-anchor' };

    expect(place(wide, DESKTOP, MENU, request).left).toBe(1092);
    expect(place(wide, DESKTOP, MENU, START_LTR).left).toBe(1100);
  });

  it.each([
    [
      'the top left of a phone below it, held off the left edge',
      2,
      10,
      START_LTR,
      { top: 46, left: 8 },
    ],
    [
      'the top right of a phone below it, held off the right edge',
      350,
      10,
      START_LTR,
      { top: 46, left: 8 },
    ],
    ['the bottom left of a phone above it', 8, 800, START_LTR, { top: 446, left: 8 }],
    ['the bottom right of a phone above it', 350, 800, END_LTR, { top: 446, left: 8 }],
  ])('places a sheet from a trigger near %s', (_case, x, y, request, placed) => {
    expect(place(trigger(x, y), PHONE, SHEET, request)).toEqual(placed);
  });

  it('places a menu from a trigger at the right of a phone header under the trigger, aligned to its end', () => {
    const menuButton: AnchorRect = { top: 12, bottom: 56, left: 326, right: 370 };

    expect(place(menuButton, PHONE, MENU, END_LTR)).toEqual({ top: 60, left: 170 });
    expect(place(menuButton, PHONE, MENU, START_LTR)).toEqual({ top: 60, left: 170 });
  });

  it('keeps an overlay clear of a classic scrollbar measured out of the viewport width', () => {
    const { left } = place(trigger(1400, 100), CLASSIC_SCROLLBAR, MENU);

    expect(left + MENU.width).toBe(1417);
  });
});

describe('overlaySpacing', () => {
  it('reads the gap and the edge margin from the resolved custom properties', () => {
    const values = new Map([
      [OVERLAY_GAP_PROPERTY, '4px'],
      [OVERLAY_EDGE_PROPERTY, '8px'],
    ]);
    const style = { getPropertyValue: (name: string) => values.get(name) ?? '' };

    expect(overlaySpacing(style)).toEqual({ gap: 4, edge: 8 });
  });

  it('reads zero for a custom property that is not set', () => {
    expect(overlaySpacing({ getPropertyValue: () => '' })).toEqual({ gap: 0, edge: 0 });
  });
});

describe('inlineDirection', () => {
  it('reads right-to-left only from rtl', () => {
    expect([inlineDirection('rtl'), inlineDirection('ltr'), inlineDirection('')]).toEqual([
      'rtl',
      'ltr',
      'ltr',
    ]);
  });
});

describe('menuInset', () => {
  it('turns a placement into pixel custom property values', () => {
    const inset = menuInset(overlayPlacement(MIDDLE, DESKTOP, MENU, START_LTR, SPACING));

    expect(inset).toEqual({
      top: '136px',
      left: '600px',
      anchorWidth: '120px',
      maxWidth: '1424px',
    });
  });

  it('sets nothing before the overlay has been placed', () => {
    expect(Object.values(menuInset(undefined))).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});

describe('hintPlacement', () => {
  const HINT: OverlaySize = { width: 80, height: 24 };

  it('centres a hint one gap above its trigger', () => {
    expect(hintPlacement(MIDDLE, DESKTOP, HINT, SPACING)).toEqual({ top: 72, left: 620 });
  });

  it('puts a hint below its trigger when the room above is too small and the room below larger', () => {
    expect(hintPlacement(trigger(600, 10), DESKTOP, HINT, SPACING)).toEqual({
      top: 46,
      left: 576,
    });
  });

  it('keeps a hint above when neither side has room, if the room above is the larger', () => {
    const tall: OverlaySize = { width: 80, height: 500 };

    expect(hintPlacement(trigger(600, 480), { width: 1440, height: 600 }, tall, SPACING).top).toBe(
      8,
    );
  });

  it('keeps a hint an edge inside the viewport where centring would cross it', () => {
    expect(hintPlacement(trigger(0, 300), PHONE, HINT, SPACING).left).toBe(8);
    expect(hintPlacement(trigger(370, 300), PHONE, HINT, SPACING).left).toBe(302);
  });

  it('narrows a hint wider than the viewport to the viewport less two edges', () => {
    const wide: OverlaySize = { width: 600, height: 24 };

    expect(hintPlacement(trigger(100, 300), PHONE, wide, SPACING).left).toBe(8);
  });
});
