import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagError, TagRepository } from '../../domain/tag/tag-repository';
import { recolourTag } from './recolour-tag';

const SFX = namedTag(tagId('a'), 'sfx', 'slate', 1);

function repository(broken = false) {
  const saved: Tag[] = [];
  const tags: TagRepository = {
    list: (): Promise<Result<readonly Tag[], TagError>> => Promise.resolve(ok(saved)),
    save: (tag: Tag): Promise<Result<void, TagError>> => {
      if (broken) return Promise.resolve(err({ kind: 'storage-unavailable' }));
      saved.push(tag);
      return Promise.resolve(ok(undefined));
    },
    remove: (): Promise<Result<void, TagError>> => Promise.resolve(ok(undefined)),
  };

  return { tags, saved };
}

describe('recolourTag', () => {
  it('stores the tag wearing the colour it was given', async () => {
    const { tags, saved } = repository();

    const recoloured = await recolourTag({ tags }, SFX, 'plum');

    expect(recoloured.ok && recoloured.value.colour).toBe('plum');
    expect(at(saved, 0).colour).toBe('plum');
  });

  it('leaves the name, the id and the moment it was made alone', async () => {
    const { tags, saved } = repository();

    await recolourTag({ tags }, SFX, 'plum');

    expect(at(saved, 0).name).toBe('sfx');
    expect(at(saved, 0).id).toBe(SFX.id);
    expect(at(saved, 0).createdAt).toBe(1);
  });

  it('reports a storage failure rather than throwing', async () => {
    const { tags } = repository(true);

    const recoloured = await recolourTag({ tags }, SFX, 'plum');

    expect(recoloured).toEqual(err({ kind: 'storage-unavailable' }));
  });
});
