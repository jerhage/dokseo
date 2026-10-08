import type { CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Catalog } from '../domain/catalog';
import { checkedDraft } from '../domain/catalog-draft';
import type { CatalogDraft, DraftRefusal } from '../domain/catalog-draft';
import type { CatalogRepository } from '../domain/catalog-repository';

type EditCatalogResult =
  | { readonly kind: 'success'; readonly catalog: Catalog }
  | { readonly kind: 'not-found'; readonly id: CatalogId }
  | { readonly kind: 'unreadable'; readonly id: CatalogId }
  | DraftRefusal
  | StorageUnavailable;

type EditCatalogDeps = { readonly catalogs: CatalogRepository };

async function editCatalog(
  deps: EditCatalogDeps,
  id: CatalogId,
  draft: CatalogDraft,
): Promise<EditCatalogResult> {
  const checked = checkedDraft(draft);
  if (checked.kind !== 'valid') return checked;

  const found = await deps.catalogs.get(id);
  if (found.kind !== 'success') return found;
  if (found.catalog === null) return { kind: 'not-found', id };

  const catalog: Catalog = { id, ...checked.draft };
  const saved = await deps.catalogs.save(catalog);
  if (saved.kind !== 'success') return saved;

  return { kind: 'success', catalog };
}

export { editCatalog };
export type { EditCatalogDeps, EditCatalogResult };
