function locksAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'locks' in navigator;
}

async function holdingLock<T>(name: string, work: () => Promise<T>): Promise<T> {
  if (!locksAvailable()) return work();
  return navigator.locks.request(name, () => work());
}

async function holdingLockIfFree(name: string, work: () => Promise<void>): Promise<void> {
  if (!locksAvailable()) return;
  await navigator.locks.request(name, { ifAvailable: true }, async (lock) => {
    if (lock !== null) await work();
  });
}

type LockAttempt<T> = { readonly kind: 'held'; readonly value: T } | { readonly kind: 'busy' };

async function tryHoldingLock<T>(name: string, work: () => Promise<T>): Promise<LockAttempt<T>> {
  if (!locksAvailable()) return { kind: 'busy' };
  return navigator.locks.request(
    name,
    { ifAvailable: true },
    async (lock): Promise<LockAttempt<T>> => {
      if (lock === null) return { kind: 'busy' };
      const value = await work();
      return { kind: 'held', value };
    },
  );
}

export { holdingLock, holdingLockIfFree, tryHoldingLock };
export type { LockAttempt };
