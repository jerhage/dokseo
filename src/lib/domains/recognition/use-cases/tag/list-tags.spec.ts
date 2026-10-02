import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagRepository } from '../../domain/tag/tag-repository';
import { listTags } from './list-tags';

const SFX = namedTag(tagId('a'), 'sfx', 'slate', 1);

const KEIGO = namedTag(tagId('b'), 'keigo', 'clay', 2);

function repository(broken = false) {
  const rows: Tag[] = [SFX, KEIGO];
  const tags: TagRepository = {
    list: () => {
      if (broken) return Promise.resolve(STORAGE_UNAVAILABLE);
      return Promise.resolve({ kind: 'success' as const, tags: rows, unreadable: [] });
    },
    save: () => Promise.resolve({ kind: 'success' as const }),
    remove: () => Promise.resolve({ kind: 'success' as const }),
  };

  return { tags };
}

describe('listTags', () => {
  it('reports every tag the repository holds', async () => {
    const { tags } = repository();

    const listed = await listTags({ tags });

    expect(listed).toEqual({ kind: 'success', tags: [SFX, KEIGO], unreadable: [] });
  });

  it('reports a browser that blocks storage', async () => {
    const { tags } = repository(true);

    const listed = await listTags({ tags });

    expect(listed).toEqual(STORAGE_UNAVAILABLE);
  });
});
