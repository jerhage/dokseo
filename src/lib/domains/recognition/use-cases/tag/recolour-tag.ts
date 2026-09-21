import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { recolouredTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagColour } from '../../domain/tag/tag-colour';
import type { TagError, TagRepository } from '../../domain/tag/tag-repository';

type RecolourTagDeps = {
  readonly tags: TagRepository;
};

async function recolourTag(
  deps: RecolourTagDeps,
  tag: Tag,
  colour: TagColour,
): Promise<Result<Tag, TagError>> {
  const recoloured = recolouredTag(tag, colour);
  const stored = await deps.tags.save(recoloured);
  if (!stored.ok) return stored;

  return ok(recoloured);
}

export { recolourTag };
export type { RecolourTagDeps };
