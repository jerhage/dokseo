import type { TagId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { Tag } from './tag';

type TagError =
  | { readonly kind: 'storage-unavailable' }
  | { readonly kind: 'storage-failed'; readonly cause: string };

interface TagRepository {
  list(): Promise<Result<readonly Tag[], TagError>>;
  save(tag: Tag): Promise<Result<void, TagError>>;
  remove(tag: TagId): Promise<Result<void, TagError>>;
}

export type { TagError, TagRepository };
