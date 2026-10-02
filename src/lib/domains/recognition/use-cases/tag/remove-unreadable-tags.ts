import type { TagId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { deleteTag } from './delete-tag';
import type { DeleteTagDeps } from './delete-tag';

type RemoveUnreadableTagsResult = { readonly kind: 'success' } | StorageUnavailable;

type RemoveUnreadableTagsDeps = DeleteTagDeps;

async function removeUnreadableTags(
  deps: RemoveUnreadableTagsDeps,
  ids: readonly TagId[],
): Promise<RemoveUnreadableTagsResult> {
  for (const id of ids) {
    const deleted = await deleteTag(deps, id);
    if (deleted.kind !== 'success') return deleted;
  }
  return { kind: 'success' };
}

export { removeUnreadableTags };
export type { RemoveUnreadableTagsDeps, RemoveUnreadableTagsResult };
