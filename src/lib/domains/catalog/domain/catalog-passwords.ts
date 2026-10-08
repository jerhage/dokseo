import type { CatalogId } from '$lib/shared/ids';

interface CatalogPasswords {
  get(id: CatalogId): string | null;
  set(id: CatalogId, password: string): void;
  forget(id: CatalogId): void;
}

export type { CatalogPasswords };
