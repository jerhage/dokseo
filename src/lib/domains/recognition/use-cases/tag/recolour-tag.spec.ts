import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagRepository } from '../../domain/tag/tag-repository';
import { recolourTag } from './recolour-tag';

const SFX = namedTag(tagId('a'), 'sfx', 'slate', 1);

function repository(broken = false) {
  const saved: Tag[] = [];
  const tags: TagRepository = {
    list: () => Promise.resolve({ kind: 'success' as const, tags: saved, unreadable: [] }),
    save: (tag: Tag) => {
      if (broken) return Promise.resolve(STORAGE_UNAVAILABLE);
      saved.push(tag);
      return Promise.resolve({ kind: 'success' as const });
    },
    remove: () => Promise.resolve({ kind: 'success' as const }),
  };

  return { tags, saved };
}

describe('recolourTag', () => {
  it('stores the tag wearing the colour it was given', async () => {
    const { tags, saved } = repository();

    const recoloured = await recolourTag({ tags }, SFX, 'plum');

    expect(recoloured.kind === 'success' && recoloured.tag.colour).toBe('plum');
    expect(at(saved, 0).colour).toBe('plum');
  });

  it('leaves the name, the id and the moment it was made alone', async () => {
    const { tags, saved } = repository();

    await recolourTag({ tags }, SFX, 'plum');

    expect(at(saved, 0).name).toBe('sfx');
    expect(at(saved, 0).id).toBe(SFX.id);
    expect(at(saved, 0).createdAt).toBe(1);
  });

  it('reports a browser that blocks storage', async () => {
    const { tags } = repository(true);

    const recoloured = await recolourTag({ tags }, SFX, 'plum');

    expect(recoloured).toEqual(STORAGE_UNAVAILABLE);
  });
});
