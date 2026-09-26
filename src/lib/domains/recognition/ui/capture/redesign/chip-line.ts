import type { TagChip } from '../tag-chip';

type ChipLine = {
  readonly shown: readonly TagChip[];
  readonly more: number;
};

const CHIPS_ON_A_CARD = 3;

function chipLine(chips: readonly TagChip[], room = CHIPS_ON_A_CARD): ChipLine {
  if (chips.length <= room) return { shown: chips, more: 0 };

  const shown = chips.slice(0, room - 1);
  return { shown, more: chips.length - shown.length };
}

export { CHIPS_ON_A_CARD, chipLine };
export type { ChipLine };
