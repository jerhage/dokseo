import type { Tag } from '../../domain/tag/tag';
import type { PickerRow } from './tag-picker.svelte';

type TagOffer = {
  readonly id: string;
  readonly row: PickerRow;
  readonly tag: Tag;
  readonly count: number;
  readonly selected: boolean;
};

type CreateOffer = {
  readonly id: string;
  readonly row: PickerRow;
  readonly name: string;
  readonly selected: boolean;
};

type PickerOffers = {
  readonly tags: readonly TagOffer[];
  readonly create: CreateOffer | null;
  readonly active: string | undefined;
};

function pickerOffers(
  rows: readonly PickerRow[],
  highlighted: number,
  prefix: string,
): PickerOffers {
  const tags: TagOffer[] = [];
  let create: CreateOffer | null = null;

  rows.forEach((row, order) => {
    const id = `${prefix}-row-${order}`;
    const selected = order === highlighted;
    if (row.kind === 'tag') tags.push({ id, row, tag: row.tag, count: row.count, selected });
    else create = { id, row, name: row.name, selected };
  });

  const active = rows.length === 0 ? undefined : `${prefix}-row-${highlighted}`;
  return { tags, create, active };
}

export { pickerOffers };
export type { CreateOffer, PickerOffers, TagOffer };
