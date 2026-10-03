import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Tag } from '../../domain/tag/tag';
import type { TagRepository } from '../../domain/tag/tag-repository';

type RestoreTagResult = { readonly kind: 'success' } | StorageUnavailable;

type RestoreTagDeps = {
  readonly tags: TagRepository;
};

function restoreTag(deps: RestoreTagDeps, tag: Tag): Promise<RestoreTagResult> {
  return deps.tags.save(tag);
}

export { restoreTag };
export type { RestoreTagDeps, RestoreTagResult };
