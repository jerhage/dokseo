import type { TagId } from '$lib/shared/ids';
import type { Tag } from '../../domain/tag/tag';
import type { TagColour } from '../../domain/tag/tag-colour';

type TagChip = {
  readonly id: TagId;
  readonly name: string;
  readonly colour: TagColour;
};

function chipsOf(carried: readonly TagId[], tags: readonly Tag[]): readonly TagChip[] {
  const known = new Map(tags.map((tag) => [tag.id, tag]));

  return carried.flatMap((id) => {
    const tag = known.get(id);
    if (tag === undefined) return [];

    return [{ id: tag.id, name: tag.name, colour: tag.colour }];
  });
}

export { chipsOf };
export type { TagChip };
