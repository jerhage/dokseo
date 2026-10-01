import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { recolouredTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagColour } from '../../domain/tag/tag-colour';
import type { TagRepository } from '../../domain/tag/tag-repository';

type RecolourTagResult = { readonly kind: 'success'; readonly tag: Tag } | StorageUnavailable;

type RecolourTagDeps = {
  readonly tags: TagRepository;
};

async function recolourTag(
  deps: RecolourTagDeps,
  tag: Tag,
  colour: TagColour,
): Promise<RecolourTagResult> {
  const recoloured = recolouredTag(tag, colour);
  const stored = await deps.tags.save(recoloured);
  if (stored.kind !== 'success') return stored;

  return { kind: 'success', tag: recoloured };
}

export { recolourTag };
export type { RecolourTagDeps, RecolourTagResult };
