function storageManager(): StorageManager | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.storage ?? null;
}

export async function requestPersistence(): Promise<boolean> {
  const storage = storageManager();
  if (typeof storage?.persist !== 'function') return false;
  try {
    return (await storage.persist()) === true;
  } catch {
    return false;
  }
}

export async function isPersisted(): Promise<boolean> {
  const storage = storageManager();
  if (typeof storage?.persisted !== 'function') return false;
  try {
    return (await storage.persisted()) === true;
  } catch {
    return false;
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  const storage = storageManager();
  if (typeof storage?.estimate !== 'function') return null;
  try {
    const { usage, quota } = await storage.estimate();
    if (typeof usage !== 'number' || typeof quota !== 'number') return null;
    return { usage, quota };
  } catch {
    return null;
  }
}
