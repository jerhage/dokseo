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

  it.each([
    ['disables a missing step when missing steps are disabled', 'disabled'],
    ['leaves a missing step out when missing steps are hidden', 'hidden'],
  ] as const)('%s', (_name, missing) => {
    expect(stepFace(null, missing)).toEqual({ kind: missing });
  });
});

describe('stepperArrows', () => {
  it.each([
    ['left and next right along a line', 'inline', { previous: 'left', next: 'right' }],
    ['up and next down along a column', 'block', { previous: 'up', next: 'down' }],
  ] as const)('points previous %s', (_case, axis, arrows) => {
    expect(stepperArrows(axis)).toEqual(arrows);
  });
});
