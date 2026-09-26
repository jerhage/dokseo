import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import type { TagChip } from '../tag-chip';
import { chipLine } from './chip-line';

function chips(count: number): readonly TagChip[] {
  return Array.from({ length: count }, (_, at) => ({
    id: tagId(`t${at}`),
    name: `tag ${at}`,
    colour: 'rose' as const,
  }));
}

describe('chipLine', () => {
  it('shows every chip that fits the room', () => {
    expect(chipLine(chips(3), 3)).toEqual({ shown: chips(3), more: 0 });
  });

  it('gives the last place to a count of the rest once the chips overflow', () => {
    const line = chipLine(chips(5), 3);

    expect(line.shown.map((chip) => chip.name)).toEqual(['tag 0', 'tag 1']);
    expect(line.more).toBe(3);
  });
});
