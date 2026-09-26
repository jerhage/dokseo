import { describe, expect, it } from 'vitest';
import { scrubStep, stepWithin, turnsSide } from './page-bar';

describe('scrubStep', () => {
  it('reads the step a range input reports', () => {
    expect(scrubStep('2', 3)).toBe(2);
  });

  it('holds a reported step inside the book', () => {
    expect(scrubStep('7', 3)).toBe(2);
    expect(scrubStep('-1', 3)).toBe(0);
  });

  it('refuses a value that is not a whole step', () => {
    expect(scrubStep('', 3)).toBeNull();
    expect(scrubStep('1.5', 3)).toBeNull();
    expect(scrubStep('page', 3)).toBeNull();
  });

  it('refuses every value when there is nowhere to go', () => {
    expect(scrubStep('0', 0)).toBeNull();
  });
});

describe('turnsSide', () => {
  it('places the turn buttons on the left of a right-to-left scrubber, where it moves forward', () => {
    expect(turnsSide('rtl')).toBe('before');
  });

  it('places the turn buttons on the right of a left-to-right scrubber, where it moves forward', () => {
    expect(turnsSide('ltr')).toBe('after');
  });
});

describe('stepWithin', () => {
  it('holds a step between the first and the last', () => {
    expect(stepWithin(-2, 5)).toBe(0);
    expect(stepWithin(3, 5)).toBe(3);
    expect(stepWithin(9, 5)).toBe(4);
  });

  it('answers the first step when there are none', () => {
    expect(stepWithin(3, 0)).toBe(0);
  });
});
