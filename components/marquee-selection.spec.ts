import { describe, expect, it } from 'vitest';
import {
  NOT_SCROLLED,
  anchorOnScreen,
  anchoredRect,
  drawsWith,
  endsInClick,
  marqueeBox,
  marqueeEnd,
  marqueePress,
  marqueeRect,
  scrolledFurther,
  stayedPut,
} from './marquee-selection';
import type { MarqueePressFacts } from './marquee-selection';

const MINIMUM = 12;

const MOUSE_SLOP = 3;

const TOUCH_SLOP = 12;

const empty = { x: 0, y: 0, width: 0, height: 0 };

describe('marqueeRect', () => {
  it('builds a rect from a drag down and to the right', () => {
    expect(marqueeRect({ x: 100, y: 50 }, { x: 260, y: 170 })).toEqual({
      x: 100,
      y: 50,
      width: 160,
      height: 120,
    });
  });

  it('gives positive extents for a drag up and to the left, or up and to the right', () => {
    const drags = [
      [
        { x: 260, y: 170 },
        { x: 100, y: 50 },
      ],
      [
        { x: 100, y: 170 },
        { x: 260, y: 50 },
      ],
    ] as const;

    for (const [from, to] of drags) {
      expect(marqueeRect(from, to)).toEqual({ x: 100, y: 50, width: 160, height: 120 });
    }
  });

  it('gives an empty rect for a drag that goes nowhere', () => {
    expect(marqueeRect({ x: 100, y: 50 }, { x: 100, y: 50 })).toEqual({
      x: 100,
      y: 50,
      width: 0,
      height: 0,
    });
  });

  it('gives an empty rect at the origin for a non-finite coordinate', () => {
    expect(marqueeRect({ x: Number.NaN, y: 50 }, { x: 260, y: 170 })).toEqual(empty);
    expect(marqueeRect({ x: 100, y: Number.NaN }, { x: 260, y: 170 })).toEqual(empty);
    expect(marqueeRect({ x: 100, y: 50 }, { x: Number.POSITIVE_INFINITY, y: 170 })).toEqual(empty);
    expect(marqueeRect({ x: 100, y: 50 }, { x: 260, y: Number.NEGATIVE_INFINITY })).toEqual(empty);
  });
});

describe('marqueeEnd', () => {
  const from = { x: 100, y: 100 };

  it('calls a still pointer a click, so the chrome still toggles', () => {
    expect(marqueeEnd(from, { x: 100, y: 100 }, MOUSE_SLOP, MINIMUM)).toEqual({ kind: 'click' });
  });

  it('calls a long thin drag too small, though it can select nothing', () => {
    expect(marqueeEnd(from, { x: 300, y: 104 }, MOUSE_SLOP, MINIMUM).kind).toBe('too-small');
  });

  it('calls a drag exactly at the minimum on both axes a selection', () => {
    expect(marqueeEnd(from, { x: 112, y: 112 }, MOUSE_SLOP, MINIMUM).kind).toBe('selection');
  });

  it('calls a drag a pixel under the minimum in width or in height too small', () => {
    expect(marqueeEnd(from, { x: 111, y: 112 }, MOUSE_SLOP, MINIMUM).kind).toBe('too-small');
    expect(marqueeEnd(from, { x: 112, y: 111 }, MOUSE_SLOP, MINIMUM).kind).toBe('too-small');
  });

  it('calls a real drag a selection, and carries the rect', () => {
    expect(marqueeEnd(from, { x: 300, y: 260 }, MOUSE_SLOP, MINIMUM)).toEqual({
      kind: 'selection',
      selection: marqueeRect(from, { x: 300, y: 260 }),
    });
  });

  it('carries the rect of a drag that ends too small', () => {
    expect(marqueeEnd(from, { x: 108, y: 104 }, MOUSE_SLOP, MINIMUM)).toEqual({
      kind: 'too-small',
      selection: { x: 100, y: 100, width: 8, height: 4 },
    });
  });

  it('calls a drift one pixel inside the slop a click and one at it too small', () => {
    expect(marqueeEnd(from, { x: 111, y: 89 }, TOUCH_SLOP, MINIMUM).kind).toBe('click');
    expect(marqueeEnd(from, { x: 112, y: 100 }, TOUCH_SLOP, MINIMUM).kind).toBe('too-small');
  });

  it('calls a drag with a non-finite end a click', () => {
    expect(marqueeEnd(from, { x: Number.NaN, y: 260 }, MOUSE_SLOP, MINIMUM)).toEqual({
      kind: 'click',
    });
  });
});

describe('endsInClick', () => {
  it('reports a click and nothing else', () => {
    const selection = { x: 0, y: 0, width: 40, height: 40 };

    expect([
      endsInClick({ kind: 'click' }),
      endsInClick({ kind: 'too-small', selection }),
      endsInClick({ kind: 'selection', selection }),
    ]).toEqual([true, false, false]);
  });
});

describe('stayedPut', () => {
  it('reads a press that released where it began as staying put', () => {
    expect(stayedPut({ x: 120, y: 80 }, { x: 120, y: 80 }, MINIMUM)).toBe(true);
  });

  it('forgives the wobble of a finger under the minimum', () => {
    expect(stayedPut({ x: 120, y: 80 }, { x: 127, y: 73 }, MINIMUM)).toBe(true);
  });

  it('rejects a press that travelled the minimum downward, upward or sideways', () => {
    const ends = [
      { x: 120, y: 80 + MINIMUM },
      { x: 120, y: 80 - MINIMUM },
      { x: 120 + MINIMUM, y: 80 },
    ];

    for (const end of ends) {
      expect(stayedPut({ x: 120, y: 80 }, end, MINIMUM), JSON.stringify(end)).toBe(false);
    }
  });

  it('rejects the flick a strip scrolls with', () => {
    expect(stayedPut({ x: 200, y: 600 }, { x: 204, y: 190 }, MINIMUM)).toBe(false);
  });

  it('measures travel by the same minimum a selection is held to', () => {
    const shy = { x: 0, y: MINIMUM - 1 };
    expect([
      stayedPut({ x: 0, y: 0 }, shy, MINIMUM),
      marqueeEnd({ x: 0, y: 0 }, shy, MOUSE_SLOP, MINIMUM).kind,
    ]).toEqual([true, 'too-small']);
  });
});

describe('drawsWith', () => {
  it('draws with every pointer type when the caller allows any', () => {
    expect(['mouse', 'pen', 'touch'].map((type) => drawsWith('any', type))).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('draws with the listed pointer types only', () => {
    expect(['mouse', 'pen', 'touch'].map((type) => drawsWith(['mouse', 'pen'], type))).toEqual([
      true,
      true,
      false,
    ]);
  });
});

describe('marqueePress', () => {
  const press: MarqueePressFacts = {
    ready: true,
    primary: true,
    button: 0,
    onContent: true,
    pointerType: 'mouse',
  };

  it('draws from a primary press of the main button on the content', () => {
    expect(marqueePress(press, 'any')).toEqual({ kind: 'drawn' });
  });

  it('watches a press whose pointer type may not draw', () => {
    expect(marqueePress({ ...press, pointerType: 'touch' }, ['mouse', 'pen'])).toEqual({
      kind: 'watched',
    });
  });

  it('ignores a press while suppressed, even of a pointer type that may not draw', () => {
    expect(marqueePress({ ...press, ready: false }, 'any')).toEqual({ kind: 'ignored' });
    expect(marqueePress({ ...press, ready: false, pointerType: 'touch' }, ['mouse'])).toEqual({
      kind: 'ignored',
    });
  });

  it('ignores a second pointer, another button and a press on the scrollbar', () => {
    expect([
      marqueePress({ ...press, primary: false }, 'any').kind,
      marqueePress({ ...press, button: 1 }, 'any').kind,
      marqueePress({ ...press, onContent: false }, 'any').kind,
    ]).toEqual(['ignored', 'ignored', 'ignored']);
  });
});

describe('marqueeBox', () => {
  it('places the drawn rect relative to the corner of the layer', () => {
    expect(marqueeBox({ x: 300, y: 200 }, { x: 250, y: 260 }, { x: 40, y: 20 })).toEqual({
      left: 210,
      top: 180,
      width: 50,
      height: 60,
    });
  });

  it('draws nothing for a drag with no width or no height', () => {
    expect([
      marqueeBox({ x: 10, y: 10 }, { x: 10, y: 60 }, { x: 0, y: 0 }),
      marqueeBox({ x: 10, y: 10 }, { x: 60, y: 10 }, { x: 0, y: 0 }),
    ]).toEqual([null, null]);
  });
});

describe('scrolledFurther', () => {
  it('adds each scroll to the distance travelled so far', () => {
    const once = scrolledFurther(NOT_SCROLLED, { x: 0, y: 120 });

    expect(scrolledFurther(once, { x: -30, y: 80 })).toEqual({ x: -30, y: 200 });
  });

  it('ignores a scroll that is not a finite distance', () => {
    expect(scrolledFurther({ x: 5, y: 40 }, { x: 0, y: Number.NaN })).toEqual({ x: 5, y: 40 });
  });
});

describe('anchorOnScreen', () => {
  it('moves the anchor up the screen by the distance scrolled down', () => {
    expect(anchorOnScreen({ x: 200, y: 300 }, { x: 10, y: 500 })).toEqual({ x: 190, y: -200 });
  });
});

describe('anchoredRect', () => {
  it('spans from the scrolled anchor to the pointer, taller than the screen', () => {
    expect(anchoredRect({ x: 100, y: 400 }, { x: 0, y: 1500 }, { x: 300, y: 700 })).toEqual({
      x: 100,
      y: -1100,
      width: 200,
      height: 1800,
    });
  });

  it('flips when a scroll up carries the anchor below the pointer', () => {
    expect(anchoredRect({ x: 100, y: 200 }, { x: 0, y: -600 }, { x: 300, y: 100 })).toEqual({
      x: 100,
      y: 100,
      width: 200,
      height: 700,
    });
  });
});
