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

export { holdingLock, holdingLockIfFree };
