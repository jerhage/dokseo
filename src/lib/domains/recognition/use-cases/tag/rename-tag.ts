import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { renamedTag, sameTagName } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagError, TagRepository } from '../../domain/tag/tag-repository';

type RenameTagError = TagError | { readonly kind: 'name-taken'; readonly tag: Tag };

type RenameTagDeps = {
  readonly tags: TagRepository;
};

async function renameTag(
  deps: RenameTagDeps,
  tag: Tag,
  name: string,
): Promise<Result<Tag, RenameTagError>> {
  const existing = await deps.tags.list();
  if (!existing.ok) return existing;

  const taken = existing.value.find(
    (other) => other.id !== tag.id && sameTagName(other.name, name),
  );
  if (taken !== undefined) return err({ kind: 'name-taken', tag: taken });

  const renamed = renamedTag(tag, name);
  const stored = await deps.tags.save(renamed);
  if (!stored.ok) return stored;

  return ok(renamed);
}

export { renameTag };
export type { RenameTagDeps, RenameTagError };
