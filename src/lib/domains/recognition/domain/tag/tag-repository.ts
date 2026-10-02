import type { TagId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Tag, UnreadableTag } from './tag';

type TagListing =
  | {
      readonly kind: 'success';
      readonly tags: readonly Tag[];
      readonly unreadable: readonly UnreadableTag[];
    }
  | StorageUnavailable;

type TagWrite = { readonly kind: 'success' } | StorageUnavailable;

interface TagRepository {
  list(): Promise<TagListing>;
  save(tag: Tag): Promise<TagWrite>;
  remove(tag: TagId): Promise<TagWrite>;
}

export type { TagListing, TagRepository, TagWrite };
