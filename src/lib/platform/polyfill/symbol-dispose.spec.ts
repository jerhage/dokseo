import { describe, expect, it } from 'vitest';
import { DISPOSE_KEY, ensureDispose } from './symbol-dispose';
import type { DisposeOwner } from './symbol-dispose';

describe('ensureDispose', () => {
  it('gives a symbol to an owner that has none, as Safari has none today', () => {
    const owner: DisposeOwner = {};

    const dispose = ensureDispose(owner);

    expect(typeof dispose).toBe('symbol');
    expect(owner.dispose).toBe(dispose);
  });

  it('uses the registered symbol the downlevelled using helper looks up', () => {
    const owner: DisposeOwner = {};

    expect(ensureDispose(owner)).toBe(Symbol.for(DISPOSE_KEY));
  });

  it('leaves an owner that already has one alone', () => {
    const native = Symbol('dispose');
    const owner: DisposeOwner = { dispose: native };

    expect(ensureDispose(owner)).toBe(native);
    expect(owner.dispose).toBe(native);
  });
});
