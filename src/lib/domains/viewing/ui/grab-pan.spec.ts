import { describe, expect, it } from 'vitest';
import { GrabPan, grabPress } from './grab-pan.svelte';
import type { GrabPointer, PointerCapture } from './grab-pan.svelte';

type Capture = PointerCapture & {
  readonly held: Set<number>;
  readonly released: number[];
};

function capture(): Capture {
  const held = new Set<number>();
  const released: number[] = [];
  return {
    held,
    released,
    hasPointerCapture: (id) => held.has(id),
    setPointerCapture: (id) => {
      held.add(id);
    },
    releasePointerCapture: (id) => {
      released.push(id);
      held.delete(id);
    },
  };
}

function pointer(pointerId: number, clientX: number, clientY: number): GrabPointer {
  return { pointerId, clientX, clientY };
}

function grabbed(bySpace = false): { readonly pan: GrabPan; readonly frame: Capture } {
  const frame = capture();
  const pan = new GrabPan(() => frame);
  pan.start(frame, pointer(7, 100, 200), bySpace);
  return { pan, frame };
}

describe('grabPress', () => {
  it('grabs with the middle button whether or not space is held', () => {
    expect(grabPress({ button: 1, isPrimary: true }, false)).toEqual({
      kind: 'grab',
      bySpace: false,
    });
    expect(grabPress({ button: 1, isPrimary: false }, true)).toEqual({
      kind: 'grab',
      bySpace: false,
    });
  });

  it('grabs by space with the main button while space is held', () => {
    expect(grabPress({ button: 0, isPrimary: true }, true)).toEqual({
      kind: 'grab',
      bySpace: true,
    });
  });

  it('selects with the main button while space is up', () => {
    expect(grabPress({ button: 0, isPrimary: true }, false)).toEqual({ kind: 'select' });
  });

  it('ignores any other button and a pointer that is not primary', () => {
    expect(grabPress({ button: 2, isPrimary: true }, true)).toEqual({ kind: 'ignore' });
    expect(grabPress({ button: 0, isPrimary: false }, true)).toEqual({ kind: 'ignore' });
    expect(grabPress({ button: 0, isPrimary: false }, false)).toEqual({ kind: 'ignore' });
  });
});

describe('GrabPan', () => {
  it('starts with nothing grabbed and space up', () => {
    const pan = new GrabPan(() => capture());

    expect([pan.grabbing, pan.spaceHeld, pan.grabbable(() => false)]).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('reads the press with space held once space goes down', () => {
    const pan = new GrabPan(() => capture());
    pan.holdSpace();

    expect(pan.press({ button: 0, isPrimary: true })).toEqual({ kind: 'grab', bySpace: true });
  });

  it('offers a grab while space is held, nothing is grabbed and no selection drags', () => {
    const pan = new GrabPan(() => capture());
    pan.holdSpace();

    expect(pan.grabbable(() => false)).toBe(true);
    expect(pan.grabbable(() => true)).toBe(false);
  });

  it('asks nothing of the selection while space is up', () => {
    const pan = new GrabPan(() => capture());
    let asked = 0;

    pan.grabbable(() => {
      asked += 1;
      return false;
    });

    expect(asked).toBe(0);
  });

  it('offers no grab once one is under way', () => {
    const { pan } = grabbed(true);
    pan.holdSpace();

    expect(pan.grabbable(() => false)).toBe(false);
  });

  it('captures the pointer it grabs with and owns only that pointer', () => {
    const { pan, frame } = grabbed();

    expect(pan.grabbing).toBe(true);
    expect([...frame.held]).toEqual([7]);
    expect([pan.owns(7), pan.owns(8)]).toEqual([true, false]);
  });

  it('owns no pointer before a grab', () => {
    expect(new GrabPan(() => capture()).owns(7)).toBe(false);
  });

  it('answers each move of the grabbing pointer with the distance since the last', () => {
    const { pan } = grabbed(true);

    const first = pan.move(pointer(7, 110, 190));
    const second = pan.move(pointer(7, 115, 230));

    expect(first).toEqual({ dx: 10, dy: -10, bySpace: true });
    expect(second).toEqual({ dx: 5, dy: 40, bySpace: true });
  });

  it('tells a middle-button grab from a space grab', () => {
    const { pan } = grabbed(false);

    expect(pan.move(pointer(7, 100, 200))).toEqual({ dx: 0, dy: 0, bySpace: false });
  });

  it('answers nothing for another pointer and keeps its place', () => {
    const { pan } = grabbed();

    const other = pan.move(pointer(8, 500, 500));
    const own = pan.move(pointer(7, 101, 201));

    expect(other).toBeNull();
    expect(own).toEqual({ dx: 1, dy: 1, bySpace: false });
  });

  it('answers nothing when nothing is grabbed', () => {
    expect(new GrabPan(() => capture()).move(pointer(7, 1, 1))).toBeNull();
  });

  it('releases the captured pointer when it stops', () => {
    const { pan, frame } = grabbed();

    pan.stop();

    expect(frame.released).toEqual([7]);
    expect(pan.grabbing).toBe(false);
    expect(pan.owns(7)).toBe(false);
  });

  it('releases nothing the frame no longer holds, and still stops', () => {
    const { pan, frame } = grabbed();
    frame.held.clear();

    pan.stop();

    expect(frame.released).toEqual([]);
    expect(pan.grabbing).toBe(false);
  });

  it('still stops when the frame is gone', () => {
    let frame: Capture | null = capture();
    const pan = new GrabPan(() => frame);
    pan.start(frame, pointer(7, 0, 0), false);
    frame = null;

    pan.stop();

    expect(pan.grabbing).toBe(false);
  });

  it('releases nothing when it stops with nothing grabbed', () => {
    const frame = capture();
    frame.held.add(7);
    const pan = new GrabPan(() => frame);

    pan.stop();

    expect(frame.released).toEqual([]);
  });

  it('ends a space grab when space comes up', () => {
    const { pan, frame } = grabbed(true);
    pan.holdSpace();

    pan.dropSpace();

    expect([pan.spaceHeld, pan.grabbing]).toEqual([false, false]);
    expect(frame.released).toEqual([7]);
  });

  it('keeps a middle-button grab when space comes up', () => {
    const { pan, frame } = grabbed(false);
    pan.holdSpace();

    pan.dropSpace();

    expect([pan.spaceHeld, pan.grabbing]).toEqual([false, true]);
    expect(frame.released).toEqual([]);
  });
});
