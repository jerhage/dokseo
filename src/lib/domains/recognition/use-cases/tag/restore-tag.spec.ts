import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { Tag } from '../../domain/tag/tag';
import type { TagRepository, TagWrite } from '../../domain/tag/tag-repository';
import { restoreTag } from './restore-tag';

const KANJI: Tag = { id: tagId('tag-kanji'), name: 'kanji', colour: 'sage', createdAt: 10 };

function repository(outcome: TagWrite) {
  const saved: Tag[] = [];
  const tags: TagRepository = {
    list: () => Promise.resolve({ kind: 'success' as const, tags: [], unreadable: [] }),
    save: (tag) => {
      saved.push(tag);
      return Promise.resolve(outcome);
    },
    remove: () => Promise.resolve({ kind: 'success' as const }),
  };
  return { tags, saved };
}

describe('restoreTag', () => {
  it('stores the tag as it was, id, colour and creation time included', async () => {
    const { tags, saved } = repository({ kind: 'success' });

    const restored = await restoreTag({ tags }, KANJI);

    expect(restored).toEqual({ kind: 'success' });
    expect(saved).toEqual([KANJI]);
  });

  it('reports a browser that blocks storage', async () => {
    const { tags } = repository(STORAGE_UNAVAILABLE);

    expect(await restoreTag({ tags }, KANJI)).toEqual(STORAGE_UNAVAILABLE);
  });
});
