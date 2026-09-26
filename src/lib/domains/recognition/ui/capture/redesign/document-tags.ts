import type { TagId } from '$lib/shared/ids';
import type { Tag } from '../../../domain/tag/tag';
import type { TagColour } from '../../../domain/tag/tag-colour';

type UsedTag = {
  readonly id: TagId;
  readonly name: string;
  readonly colour: TagColour;
  readonly count: number;
};

function tagsInUse(tags: readonly Tag[], counts: ReadonlyMap<TagId, number>): readonly UsedTag[] {
  const used = tags.flatMap((tag) => {
    const count = counts.get(tag.id) ?? 0;
    return count === 0 ? [] : [{ id: tag.id, name: tag.name, colour: tag.colour, count }];
  });

  return used.toSorted(
    (earlier, later) => later.count - earlier.count || earlier.name.localeCompare(later.name),
  );
}

export { tagsInUse };
export type { UsedTag };
