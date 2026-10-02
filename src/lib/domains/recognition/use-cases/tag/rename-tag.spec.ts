import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagRepository } from '../../domain/tag/tag-repository';
import { renameTag } from './rename-tag';

type StoreFault = 'none' | 'listing' | 'saving';

const SFX = namedTag(tagId('a'), 'sfx', 'slate', 1);
const KEIGO = namedTag(tagId('b'), 'keigo', 'clay', 2);

function repository(rows: readonly Tag[], fault: StoreFault = 'none') {
  const saved: Tag[] = [];
  const tags: TagRepository = {
    list: () => {
      if (fault === 'listing') return Promise.resolve(STORAGE_UNAVAILABLE);
      return Promise.resolve({ kind: 'success' as const, tags: rows });
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

describe('renameTag', () => {
  it('stores the name trimmed and its inner spaces collapsed', async () => {
    const { tags, saved } = repository([SFX]);

    const renamed = await renameTag({ tags }, SFX, '  sound   effects ');

    expect(renamed.kind === 'success' && renamed.tag.name).toBe('sound effects');
    expect(at(saved, 0).name).toBe('sound effects');
  });

  it('keeps the tag its id, its colour and the moment it was made', async () => {
    const { tags, saved } = repository([SFX]);

    await renameTag({ tags }, SFX, 'sound effects');

    expect(at(saved, 0).id).toBe(SFX.id);
    expect(at(saved, 0).colour).toBe('slate');
    expect(at(saved, 0).createdAt).toBe(1);
  });

  it.each([
    ['keep the name it already holds', SFX, 'sfx', 'sfx'],
    ['recase its own name', SFX, 'SFX', 'SFX'],
    [
      'respace its own name',
      namedTag(tagId('c'), 'grammar to ask', 'sage', 3),
      ' grammar    to ask ',
      'grammar to ask',
    ],
  ] as const)('lets a tag %s', async (_change, tag, name, stored) => {
    const { tags, saved } = repository([tag, KEIGO]);

    const renamed = await renameTag({ tags }, tag, name);

    expect(renamed.kind === 'success' && renamed.tag.name).toBe(stored);
    expect(at(saved, 0).name).toBe(stored);
  });

  it.each(['keigo', 'Keigo', 'ｋｅｉｇｏ'])(
    'reports the other tag and writes nothing when it already holds the name %s',
    async (name) => {
      const { tags, saved } = repository([SFX, KEIGO]);

      const renamed = await renameTag({ tags }, SFX, name);

      expect(renamed).toEqual({ kind: 'name-taken', tag: KEIGO });
      expect(saved).toEqual([]);
    },
  );

  it('reports a failure to read the tags rather than throwing', async () => {
    const { tags } = repository([SFX], 'listing');

    const renamed = await renameTag({ tags }, SFX, 'sound effects');

    expect(renamed).toEqual(STORAGE_UNAVAILABLE);
  });

  it('reports a failure to store the tag rather than throwing', async () => {
    const { tags } = repository([SFX], 'saving');

    const renamed = await renameTag({ tags }, SFX, 'sound effects');

    expect(renamed).toEqual(STORAGE_UNAVAILABLE);
  });
});
