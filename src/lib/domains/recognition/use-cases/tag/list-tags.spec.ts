import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagError, TagRepository } from '../../domain/tag/tag-repository';
import { listTags } from './list-tags';

const SFX = namedTag(tagId('a'), 'sfx', 'slate', 1);

const KEIGO = namedTag(tagId('b'), 'keigo', 'clay', 2);

function repository(broken = false) {
  const rows: Tag[] = [SFX, KEIGO];
  const tags: TagRepository = {
    list: (): Promise<Result<readonly Tag[], TagError>> => {
      if (broken) return Promise.resolve(err({ kind: 'storage-unavailable' }));
      return Promise.resolve(ok(rows));
    },
    save: (): Promise<Result<void, TagError>> => Promise.resolve(ok(undefined)),
    remove: (): Promise<Result<void, TagError>> => Promise.resolve(ok(undefined)),
  };

  return { tags };
}

describe('listTags', () => {
  it('reports every tag the repository holds', async () => {
    const { tags } = repository();

    const listed = await listTags({ tags });

    expect(listed).toEqual(ok([SFX, KEIGO]));
  });

  it('reports a storage failure rather than throwing', async () => {
    const { tags } = repository(true);

    const listed = await listTags({ tags });

    expect(listed).toEqual(err({ kind: 'storage-unavailable' }));
  });
});
