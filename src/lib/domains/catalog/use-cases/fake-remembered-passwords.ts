import type { CatalogId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { RememberedPasswords } from '../domain/remembered-passwords';

type FakeRememberedPasswords = RememberedPasswords & {
  readonly held: Map<CatalogId, string>;
  readonly unreadable: Set<CatalogId>;
  unavailable: boolean;
};

function fakeRememberedPasswords(): FakeRememberedPasswords {
  const held = new Map<CatalogId, string>();
  const unreadable = new Set<CatalogId>();
  const fake: FakeRememberedPasswords = {
    held,
    unreadable,
    unavailable: false,
    read: (id) => {
      if (fake.unavailable) return Promise.resolve(STORAGE_UNAVAILABLE);
      if (unreadable.has(id)) return Promise.resolve({ kind: 'unreadable', id });
      return Promise.resolve({ kind: 'success', password: held.get(id) ?? null });
    },
    remember: (id, password) => {
      if (fake.unavailable) return Promise.resolve(STORAGE_UNAVAILABLE);
      held.set(id, password);
      return Promise.resolve({ kind: 'success' });
    },
    forget: (id) => {
      if (fake.unavailable) return Promise.resolve(STORAGE_UNAVAILABLE);
      held.delete(id);
      unreadable.delete(id);
      return Promise.resolve({ kind: 'success' });
    },
    list: () => {
      if (fake.unavailable) return Promise.resolve(STORAGE_UNAVAILABLE);
      return Promise.resolve({ kind: 'success', ids: new Set([...held.keys(), ...unreadable]) });
    },
  };
  return fake;
}

export { fakeRememberedPasswords };
export type { FakeRememberedPasswords };
