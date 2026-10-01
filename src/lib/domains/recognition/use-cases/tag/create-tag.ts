import type { TagId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { nextColour } from '../../domain/tag/tag-colour';
import { namedTag, sameTagName } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagRepository } from '../../domain/tag/tag-repository';

type CreateTagResult =
  | { readonly kind: 'success'; readonly tag: Tag }
  | { readonly kind: 'name-taken'; readonly tag: Tag }
  | StorageUnavailable;

type CreateTagDeps = {
  readonly tags: TagRepository;
  readonly now: () => number;
};

async function createTag(deps: CreateTagDeps, id: TagId, name: string): Promise<CreateTagResult> {
  const existing = await deps.tags.list();
  if (existing.kind !== 'success') return existing;

  const taken = existing.tags.find((tag) => sameTagName(tag.name, name));
  if (taken !== undefined) return { kind: 'name-taken', tag: taken };

  const tag = namedTag(id, name, nextColour(existing.tags), deps.now());
  const stored = await deps.tags.save(tag);
  if (stored.kind !== 'success') return stored;

  return { kind: 'success', tag };
}

export { createTag };
export type { CreateTagDeps, CreateTagResult };
