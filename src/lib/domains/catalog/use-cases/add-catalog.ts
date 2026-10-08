import type { CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Catalog } from '../domain/catalog';
import { checkedDraft } from '../domain/catalog-draft';
import type { CatalogDraft, DraftRefusal } from '../domain/catalog-draft';
import type { CatalogRepository } from '../domain/catalog-repository';

type AddCatalogResult =
  | { readonly kind: 'success'; readonly catalog: Catalog }
  | DraftRefusal
  | StorageUnavailable;

type AddCatalogDeps = {
  readonly catalogs: CatalogRepository;
  readonly newId: () => CatalogId;
};

async function addCatalog(deps: AddCatalogDeps, draft: CatalogDraft): Promise<AddCatalogResult> {
  const checked = checkedDraft(draft);
  if (checked.kind !== 'valid') return checked;

  const catalog: Catalog = { id: deps.newId(), ...checked.draft };
  const saved = await deps.catalogs.save(catalog);
  if (saved.kind !== 'success') return saved;

  return { kind: 'success', catalog };
}

export { addCatalog };
export type { AddCatalogDeps, AddCatalogResult };
