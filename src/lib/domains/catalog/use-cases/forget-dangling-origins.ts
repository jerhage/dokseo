import type { CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { checkedOrigins } from './held-origins';
import type { HeldOriginsDeps } from './held-origins';

type ForgetDanglingOriginsResult =
  | { readonly kind: 'success'; readonly forgotten: number }
  | StorageUnavailable;

async function forgetDanglingOrigins(
  deps: HeldOriginsDeps,
  catalogId: CatalogId,
): Promise<ForgetDanglingOriginsResult> {
  const checked = await checkedOrigins(deps, catalogId);
  if (checked.kind !== 'success') return checked;

  for (const origin of checked.dangling) {
    const deleted = await deps.origins.deleteByBook(origin.bookId);
    if (deleted.kind !== 'success') return deleted;
  }
  return { kind: 'success', forgotten: checked.dangling.length };
}

export { forgetDanglingOrigins };
export type { ForgetDanglingOriginsResult };
