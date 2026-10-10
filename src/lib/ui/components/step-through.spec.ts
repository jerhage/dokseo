import { describe, expect, it } from 'vitest';
import { clampStep, stepCounter, stepEmphasis } from './step-through';
import { createStepThrough } from './step-through.svelte';

describe('createStepThrough', () => {
  it('starts at the first step, with nothing before it', () => {
    const steps = createStepThrough({ count: () => 3 });

    expect([steps.index, steps.atFirst, steps.atLast]).toEqual([0, true, false]);
  });

  it('moves to the next step and back to the previous one', () => {
    const steps = createStepThrough({ count: () => 3 });

    steps.next();
    expect(steps.index).toBe(1);
    steps.previous();
    expect(steps.index).toBe(0);
  });

  it('stays on the last step when asked for the next one', () => {
    const steps = createStepThrough({ count: () => 2 });

    steps.next();
    steps.next();

    expect([steps.index, steps.atLast]).toEqual([1, true]);
  });

  it('stays on the first step when asked for the previous one', () => {
    const steps = createStepThrough({ count: () => 2 });

    steps.previous();

    expect(steps.index).toBe(0);
  });

  it('starts at the initial step, held inside the steps there are', () => {
    expect(createStepThrough({ count: () => 4, initial: 2 }).index).toBe(2);
    expect(createStepThrough({ count: () => 2, initial: 9 }).index).toBe(1);
  });

  it('follows a count that shrinks below the current step', () => {
    let count = 5;
    const steps = createStepThrough({ count: () => count, initial: 4 });

    count = 2;

    expect(steps.index).toBe(1);
  });
});

describe('clampStep', () => {
  it('holds an index inside the steps, and at 0 when there are none', () => {
    expect([clampStep(-1, 3), clampStep(5, 3), clampStep(1, 0)]).toEqual([0, 2, 0]);
  });
});

describe('stepEmphasis', () => {
  it('makes the current step active and every other step dimmed', () => {
    expect([stepEmphasis(1, 1), stepEmphasis(0, 1), stepEmphasis(2, 1)]).toEqual([
      'active',
      'dimmed',
      'dimmed',
    ]);
  });
});

describe('stepCounter', () => {
  it('counts the steps from 1', () => {
    expect(stepCounter(1, 4)).toBe('Step 2 of 4');
  });
});
