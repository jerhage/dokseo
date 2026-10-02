import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagRepository } from '../../domain/tag/tag-repository';
import { createTag } from './create-tag';

type StoreFault = 'none' | 'listing' | 'saving';

const SFX = namedTag(tagId('a'), 'sfx', 'slate', 1);

function repository(rows: readonly Tag[], fault: StoreFault = 'none') {
  const saved: Tag[] = [];
  const tags: TagRepository = {
    list: () => {
      if (fault === 'listing') return Promise.resolve(STORAGE_UNAVAILABLE);
      return Promise.resolve({ kind: 'success' as const, tags: rows, unreadable: [] });
    },
    save: (tag: Tag) => {
      if (fault === 'saving') {
        return Promise.resolve(STORAGE_UNAVAILABLE);
      }
      saved.push(tag);
      return Promise.resolve({ kind: 'success' as const });
    },
    remove: () => Promise.resolve({ kind: 'success' as const }),
  };

  return { tags, saved };
}

describe('createTag', () => {
  it('stores the name trimmed and its inner spaces collapsed', async () => {
    const { tags, saved } = repository([]);

    const created = await createTag({ tags, now: () => 7 }, tagId('b'), '  grammar   to ask ');

    expect(created.kind === 'success' && created.tag.name).toBe('grammar to ask');
    expect(at(saved, 0).name).toBe('grammar to ask');
    expect(at(saved, 0).createdAt).toBe(7);
  });

  it('gives the tag the palette colour the fewest existing tags carry', async () => {
    const { tags, saved } = repository([SFX]);

    const created = await createTag({ tags, now: () => 7 }, tagId('b'), 'keigo');

    expect(created.kind === 'success' && created.tag.colour).toBe('clay');
    expect(at(saved, 0).colour).toBe('clay');
  });

  it.each(['sfx', 'SFX', 'ｓｆｘ'])(
    'reports the existing tag and writes nothing when the name %s is taken',
    async (name) => {
      const { tags, saved } = repository([SFX]);

      const created = await createTag({ tags, now: () => 7 }, tagId('b'), name);

      expect(created).toEqual({ kind: 'name-taken', tag: SFX });
      expect(saved).toEqual([]);
    },
  );

  it('reports a failure to read the tags rather than throwing', async () => {
    const { tags } = repository([], 'listing');

    const created = await createTag({ tags, now: () => 7 }, tagId('b'), 'keigo');

    expect(created).toEqual(STORAGE_UNAVAILABLE);
  });

  it('reports a failure to store the tag rather than throwing', async () => {
    const { tags } = repository([], 'saving');

    const created = await createTag({ tags, now: () => 7 }, tagId('b'), 'keigo');

    expect(created).toEqual(STORAGE_UNAVAILABLE);
  });
});
