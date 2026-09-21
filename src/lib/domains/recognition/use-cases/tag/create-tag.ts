import type { TagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { nextColour } from '../../domain/tag/tag-colour';
import { namedTag, sameTagName } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagError, TagRepository } from '../../domain/tag/tag-repository';

type CreateTagError = TagError | { readonly kind: 'name-taken'; readonly tag: Tag };

type CreateTagDeps = {
  readonly tags: TagRepository;
  readonly now: () => number;
};

async function createTag(
  deps: CreateTagDeps,
  id: TagId,
  name: string,
): Promise<Result<Tag, CreateTagError>> {
  const existing = await deps.tags.list();
  if (!existing.ok) return existing;

  const taken = existing.value.find((tag) => sameTagName(tag.name, name));
  if (taken !== undefined) return err({ kind: 'name-taken', tag: taken });

  const tag = namedTag(id, name, nextColour(existing.value), deps.now());
  const stored = await deps.tags.save(tag);
  if (!stored.ok) return stored;

  return ok(tag);
}

export { createTag };
export type { CreateTagDeps, CreateTagError };
