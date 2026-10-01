import type { TagId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { untaggedCapture } from '../../domain/tag/capture-tags';
import type { TagRepository } from '../../domain/tag/tag-repository';

type DeleteTagResult = { readonly kind: 'success'; readonly untagged: number } | StorageUnavailable;

type DeleteTagDeps = {
  readonly tags: TagRepository;
  readonly captures: CaptureRepository;
};

async function deleteTag(deps: DeleteTagDeps, tag: TagId): Promise<DeleteTagResult> {
  const everything = await deps.captures.listEverything();
  if (everything.kind !== 'success') return everything;

  const carrying = everything.captures.filter((capture) => capture.tagIds.includes(tag));

  for (const capture of carrying) {
    const stored = await deps.captures.save(untaggedCapture(capture, tag));
    if (stored.kind !== 'success') return stored;
  }

  const removed = await deps.tags.remove(tag);
  if (removed.kind !== 'success') return removed;

  return { kind: 'success', untagged: carrying.length };
}

export { deleteTag };
export type { DeleteTagDeps, DeleteTagResult };
