import type { CatalogId } from '$lib/shared/ids';
import type { CatalogPasswords } from '../domain/catalog-passwords';

function fakePasswords(): CatalogPasswords {
  const held = new Map<CatalogId, string>();
  return {
    get: (id) => held.get(id) ?? null,
    set: (id, password) => {
      held.set(id, password);
    },
    forget: (id) => {
      held.delete(id);
    },
  };
}

export { fakePasswords };
