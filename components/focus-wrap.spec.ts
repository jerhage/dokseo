import { describe, expect, it } from 'vitest';
import { wrappedStop } from './focus-wrap';

describe('wrappedStop', () => {
  it('sends Tab from the last stop to the first and Shift+Tab from the first to the last', () => {
    expect([wrappedStop(4, 3, false), wrappedStop(4, 0, true)]).toEqual([0, 3]);
  });

  it('leaves a step between two stops to the browser', () => {
    expect(wrappedStop(4, 1, false)).toBeNull();
    expect(wrappedStop(4, 2, true)).toBeNull();
    expect(wrappedStop(4, 0, false)).toBeNull();
    expect(wrappedStop(4, 3, true)).toBeNull();
  });

  it('keeps a lone stop where it is in both directions', () => {
    expect(wrappedStop(1, 0, false)).toBe(0);
    expect(wrappedStop(1, 0, true)).toBe(0);
  });

  it('leaves the key alone when the focus is on no stop or there is none', () => {
    expect(wrappedStop(4, -1, false)).toBeNull();
    expect(wrappedStop(0, -1, true)).toBeNull();
  });
});
