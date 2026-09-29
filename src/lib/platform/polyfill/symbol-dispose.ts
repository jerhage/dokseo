const DISPOSE_KEY = 'Symbol.dispose';

type DisposeOwner = { dispose?: symbol };

function ensureDispose(owner: object): symbol {
  const present: unknown = Reflect.get(owner, 'dispose');
  if (typeof present === 'symbol') return present;

  const dispose = Symbol.for(DISPOSE_KEY);
  Reflect.set(owner, 'dispose', dispose);

  return dispose;
}

export { DISPOSE_KEY, ensureDispose };
export type { DisposeOwner };
