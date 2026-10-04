import { cacheRole } from '../../../domain/offline';
import type { CacheRole } from '../../../domain/offline';

type WorkerSlot = {
  readonly state: ServiceWorkerState;
  readonly scriptURL: string;
} | null;

type WorkerReading =
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'unregistered'; readonly controlled: boolean }
  | {
      readonly kind: 'registered';
      readonly scope: string;
      readonly active: WorkerSlot;
      readonly waiting: WorkerSlot;
      readonly installing: WorkerSlot;
      readonly controlled: boolean;
    };

type CacheEntry = {
  readonly name: string;
  readonly entries: number;
  readonly role: CacheRole;
};

type CacheReading =
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'read'; readonly caches: readonly CacheEntry[] };

function slot(worker: ServiceWorker | null): WorkerSlot {
  if (worker === null) return null;
  return { state: worker.state, scriptURL: worker.scriptURL };
}

async function readWorker(): Promise<WorkerReading> {
  if (!('serviceWorker' in navigator)) return { kind: 'unsupported' };

  const container = navigator.serviceWorker;
  const controlled = container.controller !== null;
  const registration = await container.getRegistration();
  if (registration === undefined) return { kind: 'unregistered', controlled };

  return {
    kind: 'registered',
    scope: registration.scope,
    active: slot(registration.active),
    waiting: slot(registration.waiting),
    installing: slot(registration.installing),
    controlled,
  };
}

async function readCaches(version: string): Promise<CacheReading> {
  if (!('caches' in globalThis)) return { kind: 'unsupported' };

  const names = await caches.keys();
  const read = await Promise.all(
    names.map(async (name) => {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      return { name, entries: keys.length, role: cacheRole(name, version) };
    }),
  );
  return { kind: 'read', caches: read };
}

export { readCaches, readWorker };
export type { CacheEntry, CacheReading, WorkerReading, WorkerSlot };
