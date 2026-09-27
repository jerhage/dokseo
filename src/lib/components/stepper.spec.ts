import { describe, expect, it } from 'vitest';
import { stepFace, stepperArrows } from './stepper';

describe('stepFace', () => {
  it('draws a step given as an address as a link to it', () => {
    expect(stepFace('/read/b?image=2', 'disabled')).toEqual({
      kind: 'link',
      href: '/read/b?image=2',
    });
  });

  it('draws a step given as a function as a button that runs it', () => {
    let ran = 0;
    const face = stepFace(() => (ran += 1), 'hidden');

    if (face.kind !== 'action') throw new Error(`expected an action, got ${face.kind}`);
    face.run();

    expect(ran).toBe(1);
  });

  it('disables a missing step when the ends are disabled', () => {
    expect(stepFace(null, 'disabled')).toEqual({ kind: 'disabled' });
  });

  it('leaves a missing step out when the ends are hidden', () => {
    expect(stepFace(null, 'hidden')).toEqual({ kind: 'hidden' });
  });
});

describe('stepperArrows', () => {
  it('points previous left and next right along a line', () => {
    expect(stepperArrows('inline')).toEqual({ previous: 'left', next: 'right' });
  });

  it('points previous up and next down along a column', () => {
    expect(stepperArrows('block')).toEqual({ previous: 'up', next: 'down' });
  });
});
