import type { Result } from '$lib/shared/result';
import type { Tag } from '../../domain/tag/tag';
import type { TagError, TagRepository } from '../../domain/tag/tag-repository';

type ListTagsDeps = {
  readonly tags: TagRepository;
};

function listTags(deps: ListTagsDeps): Promise<Result<readonly Tag[], TagError>> {
  return deps.tags.list();
}

export { listTags };
export type { ListTagsDeps };
