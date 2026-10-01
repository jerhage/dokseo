import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Tag } from '../../domain/tag/tag';
import type { TagRepository } from '../../domain/tag/tag-repository';

type ListTagsResult =
  | { readonly kind: 'success'; readonly tags: readonly Tag[] }
  | StorageUnavailable;

type ListTagsDeps = {
  readonly tags: TagRepository;
};

function listTags(deps: ListTagsDeps): Promise<ListTagsResult> {
  return deps.tags.list();
}

export { listTags };
export type { ListTagsDeps, ListTagsResult };
