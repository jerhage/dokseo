import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { chipsOf } from './tag-chip';

const SFX: Tag = namedTag(tagId('sfx'), 'sfx', 'slate', 1);

const KEIGO: Tag = namedTag(tagId('keigo'), 'keigo', 'clay', 2);

const LIBRARY: readonly Tag[] = [SFX, KEIGO];

describe('chipsOf', () => {
  it('orders the chips the way the capture carries them', () => {
    const chips = chipsOf([KEIGO.id, SFX.id], LIBRARY);

    expect(chips.map((chip) => chip.name)).toEqual(['keigo', 'sfx']);
  });

  it('carries the name and the colour of each tag', () => {
    const chips = chipsOf([KEIGO.id], LIBRARY);

    expect(chips).toEqual([{ id: KEIGO.id, name: 'keigo', colour: 'clay' }]);
  });

  it('drops an id no tag in the library answers to', () => {
    const chips = chipsOf([SFX.id, tagId('deleted'), KEIGO.id], LIBRARY);

    expect(chips.map((chip) => chip.name)).toEqual(['sfx', 'keigo']);
  });

  it('returns nothing when the capture carries no tag', () => {
    expect(chipsOf([], LIBRARY)).toEqual([]);
  });
});
