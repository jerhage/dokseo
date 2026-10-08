import type { CatalogId } from '$lib/shared/ids';
import type { CatalogPasswords } from '../domain/catalog-passwords';

class SessionCatalogPasswords implements CatalogPasswords {
  readonly #held = new Map<CatalogId, string>();

  get(id: CatalogId): string | null {
    return this.#held.get(id) ?? null;
  }

  set(id: CatalogId, password: string): void {
    this.#held.set(id, password);
  }

  forget(id: CatalogId): void {
    this.#held.delete(id);
  }
}

export { SessionCatalogPasswords };
