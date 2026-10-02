import { describe, expect, it } from 'vitest';
import { GrabPan, grabPress } from './grab-pan.svelte';
import type { GrabPointer, GrabPress, PointerCapture } from './grab-pan.svelte';

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
  it.each<{
    readonly button: number;
    readonly isPrimary: boolean;
    readonly space: boolean;
    readonly answer: GrabPress;
  }>([
    { button: 1, isPrimary: true, space: false, answer: { kind: 'grab', bySpace: false } },
    { button: 1, isPrimary: false, space: true, answer: { kind: 'grab', bySpace: false } },
    { button: 0, isPrimary: true, space: true, answer: { kind: 'grab', bySpace: true } },
    { button: 0, isPrimary: true, space: false, answer: { kind: 'select' } },
    { button: 2, isPrimary: true, space: true, answer: { kind: 'ignore' } },
    { button: 0, isPrimary: false, space: true, answer: { kind: 'ignore' } },
    { button: 0, isPrimary: false, space: false, answer: { kind: 'ignore' } },
  ])(
    'answers $answer.kind for button $button, primary $isPrimary, space held $space',
    ({ button, isPrimary, space, answer }) => {
      expect(grabPress({ button, isPrimary }, space)).toEqual(answer);
    },
  );
});

describe('GrabPan', () => {
  it('starts with nothing grabbed, no pointer owned and space up', () => {
    const pan = new GrabPan(() => capture());

    expect([pan.grabbing, pan.spaceHeld, pan.grabbable(() => false), pan.owns(7)]).toEqual([
      false,
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

  it('answers each move of the grabbing pointer with the distance since the last', () => {
    const { pan } = grabbed(true);

    const first = pan.move(pointer(7, 110, 190));
    const second = pan.move(pointer(7, 115, 230));

    expect(first).toEqual({ dx: 10, dy: -10, bySpace: true });
    expect(second).toEqual({ dx: 5, dy: 40, bySpace: true });
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

  it('stops even when the frame is gone', () => {
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
