import { describe, expect, it } from 'vitest';
import { MarqueeDrag } from './marquee-drag.svelte';
import type { MarqueeContact, MarqueeDragHost } from './marquee-drag.svelte';
import type {
  MarqueeEnd,
  MarqueePoint,
  MarqueePointers,
  MarqueeRect,
  MarqueeRefusal,
  MarqueeStroke,
} from './marquee-selection';

type Recorded = {
  readonly starts: number[];
  readonly draws: MarqueeRect[];
  readonly ends: { readonly end: MarqueeEnd; readonly stroke: MarqueeStroke }[];
  readonly refusals: MarqueeRefusal[];
  readonly clicks: MarqueePoint[];
  readonly dismissals: number[];
  readonly released: number[];
};

type Setup = {
  readonly pointerTypes?: MarqueePointers;
  readonly suppressed?: boolean;
  readonly surface?: HTMLElement | null;
};

const SURFACE = { id: 'surface' } as unknown as HTMLElement;

const CORNER: MarqueePoint = { x: 10, y: 20 };

const MINIMUM = 8;

function rig(setup: Setup = {}): { readonly drag: MarqueeDrag; readonly seen: Recorded } {
  const seen: Recorded = {
    starts: [],
    draws: [],
    ends: [],
    refusals: [],
    clicks: [],
    dismissals: [],
    released: [],
  };
  const host: MarqueeDragHost = {
    surface: () => (setup.surface === undefined ? SURFACE : setup.surface),
    release: (id) => {
      seen.released.push(id);
    },
    pointerTypes: () => setup.pointerTypes ?? 'any',
    slop: (pointerType) => (pointerType === 'touch' ? 12 : 4),
    minimum: () => MINIMUM,
    suppressed: () => setup.suppressed ?? false,
    onstart: () => {
      seen.starts.push(1);
    },
    ondraw: (selection) => {
      seen.draws.push(selection);
    },
    onend: (end, stroke) => {
      seen.ends.push({ end, stroke });
    },
    onrefuse: (refusal) => {
      seen.refusals.push(refusal);
    },
    onclick: (at) => {
      seen.clicks.push(at);
    },
    ondismiss: () => {
      seen.dismissals.push(1);
    },
  };
  return { drag: new MarqueeDrag(host), seen };
}

function contact(id: number, x: number, y: number, pointerType = 'mouse'): MarqueeContact {
  return { id, at: { x, y }, primary: true, button: 0, pointerType, onContent: true };
}

describe('MarqueeDrag press', () => {
  it('draws from a press of a drawing pointer, starting at the press', () => {
    const { drag, seen } = rig();

    expect(drag.press(contact(1, 50, 60), () => CORNER)).toEqual({ kind: 'drawn' });
    expect(drag.dragging).toBe(true);
    expect(seen.starts).toHaveLength(1);
    expect(seen.draws).toEqual([{ x: 50, y: 60, width: 0, height: 0 }]);
  });

  it('reads the corner only for a press that draws', () => {
    const { drag } = rig({ pointerTypes: ['pen'] });
    let reads = 0;

    drag.press(contact(1, 50, 60), () => {
      reads += 1;
      return CORNER;
    });

    expect(reads).toBe(0);
  });

  it('ignores a press while suppressed', () => {
    const { drag, seen } = rig({ suppressed: true });

    expect(drag.press(contact(1, 50, 60), () => CORNER)).toEqual({ kind: 'ignored' });
    expect(drag.dragging).toBe(false);
    expect(seen.starts).toHaveLength(0);
  });

  it('places the box against the corner, and shows none for an empty drag', () => {
    const { drag } = rig();
    drag.press(contact(1, 50, 60), () => CORNER);

    expect(drag.box).toBeNull();
    drag.move(1, { x: 80, y: 100 });
    expect(drag.box).toEqual({ left: 40, top: 40, width: 30, height: 40 });
  });
});

describe('MarqueeDrag move and lift', () => {
  it('draws to a move of the held pointer and ignores another pointer', () => {
    const { drag, seen } = rig();
    drag.press(contact(1, 50, 60), () => CORNER);

    drag.move(2, { x: 90, y: 90 });
    drag.move(1, { x: 80, y: 100 });

    expect(seen.draws.at(-1)).toEqual({ x: 50, y: 60, width: 30, height: 40 });
    expect(seen.draws).toHaveLength(2);
  });

  it('ends a long drag as a selection, with its stroke, and releases the pointer', () => {
    const { drag, seen } = rig();
    drag.press(contact(1, 50, 60), () => CORNER);

    drag.lift(1, { x: 80, y: 100 }, 'mouse');

    expect(seen.ends).toEqual([
      {
        end: { kind: 'selection', selection: { x: 50, y: 60, width: 30, height: 40 } },
        stroke: { from: { x: 50, y: 60 }, to: { x: 80, y: 100 }, surface: SURFACE },
      },
    ]);
    expect(seen.released).toEqual([1]);
    expect(seen.clicks).toHaveLength(0);
    expect(drag.dragging).toBe(false);
    expect(drag.box).toBeNull();
  });

  it('reports a still lift as a click', () => {
    const { drag, seen } = rig();
    drag.press(contact(1, 50, 60), () => CORNER);

    drag.lift(1, { x: 51, y: 61 }, 'mouse');

    expect(seen.ends.map(({ end }) => end.kind)).toEqual(['click']);
    expect(seen.clicks).toEqual([{ x: 51, y: 61 }]);
  });

  it('measures the slop of the lifting pointer type', () => {
    const { drag, seen } = rig();
    drag.press(contact(1, 50, 60, 'touch'), () => CORNER);

    drag.lift(1, { x: 56, y: 66 }, 'touch');

    expect(seen.ends.map(({ end }) => end.kind)).toEqual(['click']);

    const mouse = rig();
    mouse.drag.press(contact(1, 50, 60, 'mouse'), () => CORNER);

    mouse.drag.lift(1, { x: 56, y: 66 }, 'mouse');

    expect(mouse.seen.ends.map(({ end }) => end.kind)).not.toContain('click');
    expect(mouse.seen.clicks).toEqual([]);
  });

  it('refuses a lift of another pointer and keeps the drag', () => {
    const { drag, seen } = rig();
    drag.press(contact(1, 50, 60), () => CORNER);

    drag.lift(2, { x: 80, y: 100 }, 'mouse');

    expect(seen.refusals).toEqual([{ kind: 'pointer-mismatch', held: 1, released: 2 }]);
    expect(drag.dragging).toBe(true);
  });

  it('refuses a lift once the surface is gone, and still stops the drag', () => {
    const { drag, seen } = rig({ surface: null });
    drag.press(contact(1, 50, 60), () => CORNER);

    drag.lift(1, { x: 80, y: 100 }, 'mouse');

    expect(seen.refusals).toEqual([{ kind: 'no-drag-origin', hasSurface: false, hasAnchor: true }]);
    expect(seen.ends).toHaveLength(0);
    expect(seen.released).toEqual([1]);
    expect(drag.dragging).toBe(false);
  });

  it('does nothing on a lift with no drag held', () => {
    const { drag, seen } = rig();

    drag.lift(1, { x: 80, y: 100 }, 'mouse');

    expect(seen.ends).toHaveLength(0);
    expect(seen.refusals).toHaveLength(0);
  });
});

describe('MarqueeDrag watch', () => {
  it('reports a watched press that stays put as a click', () => {
    const { drag, seen } = rig({ pointerTypes: ['pen'] });

    expect(drag.press(contact(3, 50, 60), () => CORNER)).toEqual({ kind: 'watched' });
    drag.move(3, { x: 52, y: 62 });
    drag.lift(3, { x: 52, y: 62 }, 'mouse');

    expect(seen.clicks).toEqual([{ x: 52, y: 62 }]);
    expect(seen.ends).toHaveLength(0);
    expect(drag.dragging).toBe(false);
  });

  it('reports no click for a watched press that strayed and came back', () => {
    const { drag, seen } = rig({ pointerTypes: ['pen'] });
    drag.press(contact(3, 50, 60), () => CORNER);

    drag.move(3, { x: 50, y: 60 + MINIMUM });
    drag.lift(3, { x: 50, y: 60 }, 'mouse');

    expect(seen.clicks).toHaveLength(0);
  });

  it('forgets a watch on unwatch, so its lift concludes nothing', () => {
    const { drag, seen } = rig({ pointerTypes: ['pen'] });
    drag.press(contact(3, 50, 60), () => CORNER);

    drag.unwatch();
    drag.lift(3, { x: 50, y: 60 }, 'mouse');

    expect(seen.clicks).toHaveLength(0);
  });

  it('drops a watch on cancel', () => {
    const { drag, seen } = rig({ pointerTypes: ['pen'] });
    drag.press(contact(3, 50, 60), () => CORNER);

    drag.cancel(3);
    drag.lift(3, { x: 50, y: 60 }, 'mouse');

    expect(seen.clicks).toHaveLength(0);
  });
});

describe('MarqueeDrag cancel, reset and dismiss', () => {
  it('stops the held drag on its cancel and ignores another pointer', () => {
    const { drag, seen } = rig();
    drag.press(contact(1, 50, 60), () => CORNER);

    drag.cancel(2);
    expect(drag.dragging).toBe(true);
    drag.cancel(1);

    expect(drag.dragging).toBe(false);
    expect(seen.released).toEqual([1]);
    expect(seen.ends).toHaveLength(0);
  });

  it('dismisses a kept selection and reports it', () => {
    const { drag, seen } = rig();
    drag.keep({ x: 1, y: 2, width: 30, height: 40 });

    drag.dismiss();
    drag.dismiss();

    expect(seen.dismissals).toHaveLength(1);
  });

  it('reports no dismissal with nothing drawn or kept', () => {
    const { drag, seen } = rig();

    drag.dismiss();

    expect(seen.dismissals).toHaveLength(0);
  });

  it('resets a drag without reporting a dismissal', () => {
    const { drag, seen } = rig();
    drag.press(contact(1, 50, 60), () => CORNER);

    drag.reset();

    expect(drag.dragging).toBe(false);
    expect(seen.released).toEqual([1]);
    expect(seen.dismissals).toHaveLength(0);
  });

  it('clears a kept selection when a new drag starts', () => {
    const { drag, seen } = rig();
    drag.keep({ x: 1, y: 2, width: 30, height: 40 });
    drag.press(contact(1, 50, 60), () => CORNER);
    drag.lift(1, { x: 80, y: 100 }, 'mouse');

    drag.dismiss();

    expect(seen.dismissals).toHaveLength(0);
  });
});

describe('MarqueeDrag driven strokes', () => {
  it('begins, extends and ends a driven stroke as touch, without a click', () => {
    const { drag, seen } = rig();

    drag.beginAt(4, { x: 50, y: 60 }, { x: 52, y: 62 }, () => CORNER);
    drag.extendTo({ x: 55, y: 64 });
    drag.endAt({ x: 56, y: 66 });

    expect(seen.starts).toHaveLength(1);
    expect(seen.draws).toHaveLength(2);
    expect(seen.ends.map(({ end }) => end.kind)).toEqual(['click']);
    expect(seen.clicks).toHaveLength(0);
  });

  it('begins no driven stroke while suppressed', () => {
    const { drag, seen } = rig({ suppressed: true });

    drag.beginAt(4, { x: 50, y: 60 }, { x: 52, y: 62 }, () => CORNER);

    expect(drag.dragging).toBe(false);
    expect(seen.starts).toHaveLength(0);
  });

  it('abandons a driven stroke without ending it', () => {
    const { drag, seen } = rig();
    drag.beginAt(4, { x: 50, y: 60 }, { x: 80, y: 100 }, () => CORNER);

    drag.abandon();
    drag.endAt({ x: 90, y: 110 });

    expect(seen.released).toEqual([4]);
    expect(seen.ends).toHaveLength(0);
  });
});

describe('MarqueeDrag followScroll', () => {
  it('moves the anchor against the scroll and redraws to the pointer', () => {
    const { drag, seen } = rig();
    drag.press(contact(1, 50, 60), () => CORNER);
    drag.move(1, { x: 80, y: 100 });

    drag.followScroll({ x: 0, y: 30 });

    expect(seen.draws.at(-1)).toEqual({ x: 50, y: 30, width: 30, height: 70 });
    drag.lift(1, { x: 80, y: 100 }, 'mouse');
    expect(seen.ends[0]?.stroke.from).toEqual({ x: 50, y: 30 });
  });

  it('ignores a scroll with no drag held', () => {
    const { drag, seen } = rig();

    drag.followScroll({ x: 0, y: 30 });

    expect(seen.draws).toHaveLength(0);
  });

  it('starts a new drag unscrolled', () => {
    const { drag, seen } = rig();
    drag.press(contact(1, 50, 60), () => CORNER);
    drag.followScroll({ x: 0, y: 30 });
    drag.lift(1, { x: 50, y: 30 }, 'mouse');

    drag.press(contact(2, 50, 60), () => CORNER);
    drag.lift(2, { x: 80, y: 100 }, 'mouse');

    expect(seen.ends[1]?.stroke.from).toEqual({ x: 50, y: 60 });
  });
});
