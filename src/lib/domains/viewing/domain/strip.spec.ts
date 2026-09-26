import { describe, expect, it } from 'vitest';
import type { Size } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import { at } from '$lib/shared/testing/at';
import { readingPosition } from './reading-position';
import type { ReadingPosition } from './reading-position';
import {
  AHEAD_SCREENS,
  anchorOf,
  ASSUMED_ASPECT,
  BEHIND_SCREENS,
  layOutStrip,
  MOST_SLICES,
  positionAtScroll,
  relayoutFor,
  scrollForPosition,
  shownThroughAtScroll,
  spacersFor,
  stripHeight,
  stripWindow,
  travelBetween,
  visibleRange,
} from './strip';
import type { SliceLayout } from './strip';

const WIDTH = 800;

const ASSUMED_HEIGHT = WIDTH * ASSUMED_ASPECT;

const tall: Size = { width: 800, height: 4000 };

function unmeasured(count: number): readonly (Size | null)[] {
  return Array.from({ length: count }, () => null);
}

function bottomOf(slice: SliceLayout): number {
  return slice.top + slice.height;
}

function positionAt(layout: readonly SliceLayout[], scrollTop: number): ReadingPosition {
  const position = positionAtScroll(layout, scrollTop);
  if (position === null) throw new Error(`expected a position at ${scrollTop}`);
  return position;
}

describe('layOutStrip', () => {
  it('stacks every slice directly below the one before it', () => {
    const layout = layOutStrip([tall, null, { width: 800, height: 800 }, null], WIDTH);

    for (let index = 1; index < layout.length; index += 1) {
      expect(at(layout, index).top).toBeCloseTo(bottomOf(at(layout, index - 1)));
    }
  });

  it('gives every slice the same width by scaling its height from that width', () => {
    const layout = layOutStrip([{ width: 400, height: 1600 }], WIDTH);

    expect(at(layout, 0).height).toBeCloseTo(WIDTH * 4);
  });

  it('uses the measured aspect where a size is known', () => {
    const layout = layOutStrip([tall], WIDTH);

    expect(at(layout, 0).height).toBeCloseTo(WIDTH * (4000 / 800));
  });

  it('falls back to the assumed aspect where no size is known', () => {
    const layout = layOutStrip([null], WIDTH);

    expect(at(layout, 0).height).toBeCloseTo(ASSUMED_HEIGHT);
  });

  it('assumes a slice is taller than it is wide', () => {
    expect(ASSUMED_ASPECT).toBeGreaterThan(1);
  });

  it('marks which slices were measured and which were assumed', () => {
    const layout = layOutStrip([tall, null, tall], WIDTH);

    expect(layout.map((slice) => slice.measured)).toEqual([true, false, true]);
  });

  it('numbers each slice by its position in the sequence', () => {
    const layout = layOutStrip(unmeasured(3), WIDTH);

    expect(layout.map((slice) => slice.index)).toEqual([
      imageIndex(0),
      imageIndex(1),
      imageIndex(2),
    ]);
  });

  it('leaves no gap between a measured slice and an assumed one', () => {
    const layout = layOutStrip([null, tall, null, tall], WIDTH);

    expect(at(layout, 1).top).toBeCloseTo(ASSUMED_HEIGHT);
    expect(at(layout, 2).top).toBeCloseTo(ASSUMED_HEIGHT + WIDTH * 5);
    expect(at(layout, 3).top).toBeCloseTo(ASSUMED_HEIGHT * 2 + WIDTH * 5);
  });

  it('returns nothing for no slices at all', () => {
    expect(layOutStrip([], WIDTH)).toEqual([]);
  });

  it('collapses every slice to zero height for a degenerate width', () => {
    for (const width of [0, -600, Number.NaN, Number.POSITIVE_INFINITY]) {
      const layout = layOutStrip([tall, null, tall], width);

      expect(layout.map((slice) => slice.height)).toEqual([0, 0, 0]);
      expect(layout.map((slice) => slice.top)).toEqual([0, 0, 0]);
    }
  });

  it('treats a degenerate natural size as unmeasured rather than poisoning the strip', () => {
    const degenerate: readonly (Size | null)[] = [
      { width: 0, height: 1200 },
      { width: 800, height: 0 },
      { width: Number.NaN, height: 1200 },
      { width: 800, height: Number.POSITIVE_INFINITY },
      { width: -800, height: -1200 },
    ];
    const layout = layOutStrip(degenerate, WIDTH);

    expect(layout.map((slice) => slice.measured)).toEqual([false, false, false, false, false]);
    expect(layout.map((slice) => slice.height)).toEqual(
      Array.from(degenerate, () => ASSUMED_HEIGHT),
    );
  });

  it('keeps every top and height finite across degenerate input', () => {
    const layout = layOutStrip([{ width: 0, height: 0 }, null, tall], Number.NEGATIVE_INFINITY);

    for (const slice of layout) {
      expect(Number.isFinite(slice.top) && Number.isFinite(slice.height)).toBe(true);
    }
  });
});

describe('stripHeight', () => {
  it('reports the total of every slice height', () => {
    expect(stripHeight(layOutStrip(unmeasured(4), WIDTH))).toBeCloseTo(ASSUMED_HEIGHT * 4);
  });

  it('reports the total across a mixture of measured and assumed slices', () => {
    expect(stripHeight(layOutStrip([tall, null, tall], WIDTH))).toBeCloseTo(
      WIDTH * 5 + ASSUMED_HEIGHT + WIDTH * 5,
    );
  });

  it('reports zero for an empty layout', () => {
    expect(stripHeight([])).toBe(0);
  });
});

describe('visibleRange', () => {
  const layout = layOutStrip(unmeasured(10), WIDTH);

  it('finds the slices under a scroll in the middle of the strip', () => {
    expect(visibleRange(layout, ASSUMED_HEIGHT * 3 + 100, 1000, 0)).toEqual({
      first: 3,
      last: 3,
    });
  });

  it('finds the first slices at the very top of the strip', () => {
    expect(visibleRange(layout, 0, ASSUMED_HEIGHT * 2, 0)).toEqual({ first: 0, last: 2 });
  });

  it('finds the last slice at the very end of the strip', () => {
    const scrollTop = stripHeight(layout) - 600;

    expect(visibleRange(layout, scrollTop, 600, 0)).toEqual({ first: 9, last: 9 });
  });

  it('widens the range by the overscan on both sides', () => {
    const scrollTop = ASSUMED_HEIGHT * 4 + 100;

    expect(visibleRange(layout, scrollTop, 400, 0)).toEqual({ first: 4, last: 4 });
    expect(visibleRange(layout, scrollTop, 400, ASSUMED_HEIGHT)).toEqual({ first: 3, last: 5 });
  });

  it('ignores a negative or non-finite overscan', () => {
    const scrollTop = ASSUMED_HEIGHT * 4 + 100;

    expect(visibleRange(layout, scrollTop, 400, -5000)).toEqual({ first: 4, last: 4 });
    expect(visibleRange(layout, scrollTop, 400, Number.NaN)).toEqual({ first: 4, last: 4 });
  });

  it('returns a range that loops over nothing for an empty layout', () => {
    const range = visibleRange([], 0, 900, 200);

    expect(range.last).toBeLessThan(range.first);
    expect([].slice(range.first, range.last + 1)).toEqual([]);
  });

  it('returns a range that loops over nothing for a scroll past the end', () => {
    const range = visibleRange(layout, stripHeight(layout) + 10_000, 900, 100);

    expect(range.last).toBeLessThan(range.first);
    expect(layout.slice(range.first, range.last + 1)).toEqual([]);
  });

  it('covers the whole strip for a viewport taller than it', () => {
    expect(visibleRange(layout, 0, stripHeight(layout) * 2, 0)).toEqual({ first: 0, last: 9 });
  });
});

describe('travelBetween', () => {
  it('reports down when the scroll grows and up when it shrinks', () => {
    expect(travelBetween(100, 250, 'up')).toBe('down');
    expect(travelBetween(250, 100, 'down')).toBe('up');
  });

  it('keeps the last travel when the scroll has not moved', () => {
    expect(travelBetween(300, 300, 'up')).toBe('up');
    expect(travelBetween(300, 300, 'down')).toBe('down');
  });

  it('keeps the last travel for a non-finite scroll', () => {
    expect(travelBetween(Number.NaN, 300, 'up')).toBe('up');
    expect(travelBetween(300, Number.POSITIVE_INFINITY, 'up')).toBe('up');
  });
});

describe('stripWindow', () => {
  const SCREEN = 1000;
  const SHORT: Size = { width: WIDTH, height: 400 };
  const SHORT_HEIGHT = WIDTH * (400 / 800);
  const layout = layOutStrip(unmeasured(40), WIDTH);
  const scrollTop = ASSUMED_HEIGHT * 20 + 100;

  it('reaches further ahead of a downward travel than behind it', () => {
    const range = stripWindow(layout, scrollTop, SCREEN, 'down');
    const shown = visibleRange(layout, scrollTop, SCREEN, 0);

    expect(range.last - shown.last).toBeGreaterThan(shown.first - range.first);
  });

  it('reaches further ahead of an upward travel than below it', () => {
    const range = stripWindow(layout, scrollTop, SCREEN, 'up');
    const shown = visibleRange(layout, scrollTop, SCREEN, 0);

    expect(shown.first - range.first).toBeGreaterThan(range.last - shown.last);
  });

  it('reaches the named number of screens each way while under the cap', () => {
    const tallLayout = layOutStrip(
      Array.from({ length: 40 }, () => ({ width: WIDTH, height: 2400 })),
      WIDTH,
    );
    const sliceHeight = WIDTH * 3;
    const top = sliceHeight * 20 + 10;

    expect(visibleRange(tallLayout, top, sliceHeight, 0)).toEqual({ first: 20, last: 21 });
    expect(stripWindow(tallLayout, top, sliceHeight, 'down')).toEqual({
      first: 20 - BEHIND_SCREENS,
      last: 21 + AHEAD_SCREENS,
    });
    expect(stripWindow(tallLayout, top, sliceHeight, 'up')).toEqual({
      first: 20 - AHEAD_SCREENS,
      last: 21 + BEHIND_SCREENS,
    });
  });

  it('mounts no more than the cap of slices, keeping the ones ahead first', () => {
    const shortLayout = layOutStrip(
      Array.from({ length: 60 }, () => SHORT),
      WIDTH,
    );
    const top = SHORT_HEIGHT * 30;
    const range = stripWindow(shortLayout, top, SCREEN, 'down');
    const shown = visibleRange(shortLayout, top, SCREEN, 0);

    expect(range.last - range.first + 1).toBe(MOST_SLICES);
    expect(range.first).toBe(shown.first);
    expect(range.last).toBeGreaterThan(shown.last);
  });

  it('keeps the slices on screen when they alone exceed the cap', () => {
    const shortLayout = layOutStrip(
      Array.from({ length: 60 }, () => SHORT),
      WIDTH,
    );
    const screen = SHORT_HEIGHT * (MOST_SLICES + 4);
    const shown = visibleRange(shortLayout, 0, screen, 0);

    expect(stripWindow(shortLayout, 0, screen, 'down')).toEqual(shown);
  });

  it('returns a range that loops over nothing for an empty layout', () => {
    const range = stripWindow([], 0, SCREEN, 'down');

    expect(range.last).toBeLessThan(range.first);
  });

  it('returns a range that loops over nothing for a scroll past the end', () => {
    const range = stripWindow(layout, stripHeight(layout) + 10_000, SCREEN, 'up');

    expect(range.last).toBeLessThan(range.first);
  });
});

describe('relayoutFor', () => {
  const sizes = unmeasured(10);
  const layout = layOutStrip(sizes, WIDTH);
  const reading = anchorOf(layout, WIDTH, imageIndex(4));

  it('places a hold that no scroll of the reader set', () => {
    expect(relayoutFor(layout, WIDTH, null)).toEqual({ kind: 'place' });
  });

  it('stays when the anchor slice itself is measured', () => {
    const measured = [...sizes];
    measured[4] = tall;

    expect(relayoutFor(layOutStrip(measured, WIDTH), WIDTH, reading)).toEqual({ kind: 'stay' });
  });

  it('stays when a slice below the anchor is measured', () => {
    const measured = [...sizes];
    measured[7] = tall;

    expect(relayoutFor(layOutStrip(measured, WIDTH), WIDTH, reading)).toEqual({ kind: 'stay' });
  });

  it('follows the anchor when a slice above it is measured', () => {
    const measured = [...sizes];
    measured[2] = tall;

    expect(relayoutFor(layOutStrip(measured, WIDTH), WIDTH, reading)).toEqual({
      kind: 'follow',
    });
  });

  it('follows the anchor when the width changes, even where its top edge stays', () => {
    const wider = WIDTH * 2;
    const first = anchorOf(layout, WIDTH, imageIndex(0));

    expect(relayoutFor(layOutStrip(sizes, wider), wider, first)).toEqual({ kind: 'follow' });
  });

  it('follows when the anchor slice is gone from the layout', () => {
    expect(relayoutFor(layOutStrip(unmeasured(3), WIDTH), WIDTH, reading)).toEqual({
      kind: 'follow',
    });
  });
});

describe('anchorOf', () => {
  it('records the top of the slice and the width it was laid out at', () => {
    const layout = layOutStrip(unmeasured(5), WIDTH);

    expect(anchorOf(layout, WIDTH, imageIndex(3))).toEqual({
      index: imageIndex(3),
      edge: ASSUMED_HEIGHT * 3,
      width: WIDTH,
    });
  });

  it('reports nothing for an index outside the layout', () => {
    expect(anchorOf(layOutStrip(unmeasured(2), WIDTH), WIDTH, imageIndex(5))).toBeNull();
  });
});

describe('spacersFor', () => {
  const ODD_WIDTH = 333;
  const layout = layOutStrip(unmeasured(6), ODD_WIDTH);

  function whole(value: number): number {
    return Math.round(value);
  }

  function filledBy(slices: readonly { readonly height: number }[]): number {
    return slices.reduce((sum, slice) => sum + slice.height, 0);
  }

  it('pads the top by the offset of the first visible slice', () => {
    expect(spacersFor(layout, { first: 2, last: 3 }, whole).before).toBe(whole(at(layout, 2).top));
  });

  it('rounds every rendered height with the snap it is given', () => {
    const spacers = spacersFor(layout, { first: 0, last: 5 }, whole);

    expect(spacers.slices.every((slice) => Number.isInteger(slice.height))).toBe(true);
  });

  it('makes the bottom of each slice the top of the next one exactly', () => {
    const spacers = spacersFor(layout, { first: 1, last: 4 }, whole);
    let edge = spacers.before;

    for (let step = 0; step < spacers.slices.length; step += 1) {
      edge += at(spacers.slices, step).height;

      expect(edge).toBe(whole(bottomOf(at(layout, step + 1))));
    }
  });

  it('accumulates no drift against the layout down a long strip', () => {
    const long = layOutStrip(unmeasured(200), ODD_WIDTH);
    const spacers = spacersFor(long, { first: 0, last: 199 }, whole);
    const spanned = spacers.before + filledBy(spacers.slices);

    expect(spanned).toBe(whole(stripHeight(long)));
    expect(Math.abs(spanned - stripHeight(long))).toBeLessThanOrEqual(1);
  });

  it('leaves the total height of the strip unchanged by the rounding', () => {
    const spacers = spacersFor(layout, { first: 2, last: 3 }, whole);

    expect(spacers.before + filledBy(spacers.slices) + spacers.after).toBeCloseTo(
      stripHeight(layout),
    );
  });

  it('names each visible slice by its image index', () => {
    const spacers = spacersFor(layout, { first: 1, last: 3 }, whole);

    expect(spacers.slices.map((slice) => slice.index)).toEqual([
      imageIndex(1),
      imageIndex(2),
      imageIndex(3),
    ]);
  });

  it('reserves the whole strip and renders nothing for an empty range', () => {
    const spacers = spacersFor(layout, { first: 0, last: -1 }, whole);

    expect(spacers.slices).toEqual([]);
    expect(spacers.before).toBe(0);
    expect(spacers.after).toBeCloseTo(stripHeight(layout));
  });

  it('reserves nothing at all for an empty layout', () => {
    expect(spacersFor([], { first: 0, last: -1 }, whole)).toEqual({
      before: 0,
      slices: [],
      after: 0,
    });
  });

  it('stops at the last slice when the range runs past the end', () => {
    expect(spacersFor(layout, { first: 4, last: 99 }, whole).slices).toHaveLength(2);
  });
});

describe('positionAtScroll', () => {
  const layout = layOutStrip(unmeasured(5), WIDTH);

  it('names the slice under the scroll and the fraction through it', () => {
    const position = positionAt(layout, ASSUMED_HEIGHT * 2 + ASSUMED_HEIGHT / 4);

    expect(position.index).toBe(imageIndex(2));
    expect(position.offset).toBeCloseTo(0.25);
  });

  it('names the later slice for a scroll exactly on a boundary', () => {
    const position = positionAt(layout, ASSUMED_HEIGHT * 3);

    expect(position.index).toBe(imageIndex(3));
    expect(position.offset).toBeCloseTo(0);
  });

  it('clamps a scroll before the start to the first slice', () => {
    const position = positionAt(layout, -4000);

    expect(position.index).toBe(imageIndex(0));
    expect(position.offset).toBe(0);
  });

  it('clamps a scroll past the end to the end of the last slice', () => {
    const position = positionAt(layout, stripHeight(layout) + 4000);

    expect(position.index).toBe(imageIndex(4));
    expect(position.offset).toBe(1);
  });

  it('falls back to the start for a non-finite scroll', () => {
    const position = positionAt(layout, Number.NaN);

    expect(position.index).toBe(imageIndex(0));
    expect(position.offset).toBe(0);
  });

  it('returns nothing for an empty layout', () => {
    expect(positionAtScroll([], 500)).toBeNull();
  });
});

describe('shownThroughAtScroll', () => {
  const short: Size = { width: 800, height: 300 };
  const panel: Size = { width: 800, height: 2400 };
  const VIEWPORT = 1000;
  const layout = layOutStrip([panel, panel, panel, panel, short], WIDTH);
  const endOfStrip = stripHeight(layout) - VIEWPORT;

  it('names the short last image once the strip is scrolled to its end', () => {
    expect(positionAt(layout, endOfStrip).index).toBe(imageIndex(3));
    expect(shownThroughAtScroll(layout, endOfStrip, VIEWPORT)).toBe(imageIndex(4));
  });

  it('names the image before the last while the last image is still below the screen', () => {
    expect(shownThroughAtScroll(layout, endOfStrip - 400, VIEWPORT)).toBe(imageIndex(3));
  });

  it('names the image before the last while the last image is only partly on screen', () => {
    expect(shownThroughAtScroll(layout, endOfStrip - 100, VIEWPORT)).toBe(imageIndex(3));
  });

  it('names the image under the top of the screen when no image ends on screen', () => {
    expect(shownThroughAtScroll(layout, 2400 + 200, VIEWPORT)).toBe(imageIndex(1));
  });

  it('names the last image of a strip shorter than the screen', () => {
    const brief = layOutStrip([short, short], WIDTH);

    expect(shownThroughAtScroll(brief, 0, VIEWPORT)).toBe(imageIndex(1));
  });

  it('returns nothing for an empty layout', () => {
    expect(shownThroughAtScroll([], 0, VIEWPORT)).toBeNull();
  });
});

describe('scrollForPosition', () => {
  const layout = layOutStrip([tall, null, tall, null], WIDTH);

  it('puts the named slice at the top of the viewport', () => {
    expect(scrollForPosition(layout, readingPosition(imageIndex(2), 0))).toBeCloseTo(
      at(layout, 2).top,
    );
  });

  it('advances into the slice by its fraction', () => {
    const slice = at(layout, 2);

    expect(scrollForPosition(layout, readingPosition(slice.index, 0.5))).toBeCloseTo(
      slice.top + slice.height / 2,
    );
  });

  it('returns the start of the strip for a slice the layout does not hold', () => {
    expect(scrollForPosition(layout, readingPosition(imageIndex(99), 0.5))).toBe(0);
  });

  it('round-trips a position back to the scroll it came from', () => {
    for (const scrollTop of [0, 137, 2400, stripHeight(layout) / 2, stripHeight(layout) - 1]) {
      const position = positionAt(layout, scrollTop);

      expect(scrollForPosition(layout, position)).toBeCloseTo(scrollTop, 0);
    }
  });

  it('round-trips a scroll back to the position it came from', () => {
    const position = readingPosition(imageIndex(1), 0.375);
    const roundTripped = positionAt(layout, scrollForPosition(layout, position));

    expect(roundTripped.index).toBe(position.index);
    expect(roundTripped.offset).toBeCloseTo(position.offset);
  });
});

describe('a layout recomputed with a newly measured slice', () => {
  const assumed = layOutStrip(unmeasured(5), WIDTH);
  const scrollTop = ASSUMED_HEIGHT * 3 + ASSUMED_HEIGHT / 4;
  const position = positionAt(assumed, scrollTop);
  const refined = layOutStrip([tall, null, null, null, null], WIDTH);

  it('keeps the reader on the same image at the same fraction', () => {
    const moved = positionAt(refined, scrollForPosition(refined, position));

    expect(moved.index).toBe(position.index);
    expect(moved.offset).toBeCloseTo(position.offset);
  });

  it('moves the scroll offset that position now maps to', () => {
    const grown = WIDTH * 5 - ASSUMED_HEIGHT;

    expect(scrollForPosition(refined, position)).toBeCloseTo(scrollTop + grown);
    expect(scrollForPosition(refined, position)).not.toBeCloseTo(scrollTop);
  });

  it('leaves the slices contiguous after the recompute', () => {
    for (let index = 1; index < refined.length; index += 1) {
      expect(at(refined, index).top).toBeCloseTo(bottomOf(at(refined, index - 1)));
    }
  });
});
