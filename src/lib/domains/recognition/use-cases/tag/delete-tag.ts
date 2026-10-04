import type { TagId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import type { TagRepository } from '../../domain/tag/tag-repository';

type DeleteTagResult = { readonly kind: 'success'; readonly untagged: number } | StorageUnavailable;

type DeleteTagDeps = {
  readonly tags: TagRepository;
  readonly captures: CaptureRepository;
};

async function deleteTag(deps: DeleteTagDeps, tag: TagId): Promise<DeleteTagResult> {
  const untagging = await deps.captures.untagEverywhere(tag);
  if (untagging.kind !== 'success') return untagging;

  const removed = await deps.tags.remove(tag);
  if (removed.kind !== 'success') return removed;

  return { kind: 'success', untagged: untagging.untagged };
}

export { deleteTag };
export type { DeleteTagDeps, DeleteTagResult };
