import { describe, expect, it } from 'vitest';
import { DISPOSE_KEY, ensureDispose } from './symbol-dispose';
import type { DisposeOwner } from './symbol-dispose';

describe('ensureDispose', () => {
  it('gives an owner that has none the registered symbol the downlevelled using helper looks up, as Safari has none today', () => {
    const owner: DisposeOwner = {};

    const dispose = ensureDispose(owner);

    expect(dispose).toBe(Symbol.for(DISPOSE_KEY));
    expect(owner.dispose).toBe(dispose);
  });

  it('leaves an owner that already has one alone', () => {
    const native = Symbol('dispose');
    const owner: DisposeOwner = { dispose: native };

    expect(ensureDispose(owner)).toBe(native);
    expect(owner.dispose).toBe(native);
  });
});
