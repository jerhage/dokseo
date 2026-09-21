const DISPOSE_KEY = 'Symbol.dispose';

type DisposeOwner = { dispose?: symbol };

function ensureDispose(owner: DisposeOwner): symbol {
  owner.dispose ??= Symbol.for(DISPOSE_KEY);
  return owner.dispose;
}

export { DISPOSE_KEY, ensureDispose };
export type { DisposeOwner };
