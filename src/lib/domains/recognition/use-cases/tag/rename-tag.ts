import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { renamedTag, sameTagName } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagRepository } from '../../domain/tag/tag-repository';

type RenameTagResult =
  | { readonly kind: 'success'; readonly tag: Tag }
  | { readonly kind: 'name-taken'; readonly tag: Tag }
  | StorageUnavailable;

type RenameTagDeps = {
  readonly tags: TagRepository;
};

async function renameTag(deps: RenameTagDeps, tag: Tag, name: string): Promise<RenameTagResult> {
  const existing = await deps.tags.list();
  if (existing.kind !== 'success') return existing;

  const taken = existing.tags.find((other) => other.id !== tag.id && sameTagName(other.name, name));
  if (taken !== undefined) return { kind: 'name-taken', tag: taken };

  const renamed = renamedTag(tag, name);
  const stored = await deps.tags.save(renamed);
  if (stored.kind !== 'success') return stored;

  return { kind: 'success', tag: renamed };
}

export { renameTag };
export type { RenameTagDeps, RenameTagResult };
