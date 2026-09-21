import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagError, TagRepository } from '../../domain/tag/tag-repository';
import { createTag } from './create-tag';

type StoreFault = 'none' | 'listing' | 'saving';

const SFX = namedTag(tagId('a'), 'sfx', 'slate', 1);

function repository(rows: readonly Tag[], fault: StoreFault = 'none') {
  const saved: Tag[] = [];
  const tags: TagRepository = {
    list: (): Promise<Result<readonly Tag[], TagError>> => {
      if (fault === 'listing') return Promise.resolve(err({ kind: 'storage-unavailable' }));
      return Promise.resolve(ok(rows));
    },
    save: (tag: Tag): Promise<Result<void, TagError>> => {
      if (fault === 'saving') {
        return Promise.resolve(err({ kind: 'storage-failed', cause: 'the disk is full' }));
      }
      saved.push(tag);
      return Promise.resolve(ok(undefined));
    },
    remove: (): Promise<Result<void, TagError>> => Promise.resolve(ok(undefined)),
  };

  return { tags, saved };
}

describe('createTag', () => {
  it('stores the name trimmed and its inner spaces collapsed', async () => {
    const { tags, saved } = repository([]);

    const created = await createTag({ tags, now: () => 7 }, tagId('b'), '  grammar   to ask ');

    expect(created.ok && created.value.name).toBe('grammar to ask');
    expect(at(saved, 0).name).toBe('grammar to ask');
    expect(at(saved, 0).createdAt).toBe(7);
  });

  it('gives the tag the palette colour the fewest existing tags carry', async () => {
    const { tags, saved } = repository([SFX]);

    const created = await createTag({ tags, now: () => 7 }, tagId('b'), 'keigo');

    expect(created.ok && created.value.colour).toBe('clay');
    expect(at(saved, 0).colour).toBe('clay');
  });

  it('reports the existing tag and writes nothing when the name is taken', async () => {
    const { tags, saved } = repository([SFX]);

    const created = await createTag({ tags, now: () => 7 }, tagId('b'), 'sfx');

    expect(created).toEqual(err({ kind: 'name-taken', tag: SFX }));
    expect(saved).toEqual([]);
  });

  it('treats a name that differs only by case as taken', async () => {
    const { tags, saved } = repository([SFX]);

    const created = await createTag({ tags, now: () => 7 }, tagId('b'), 'SFX');

    expect(created).toEqual(err({ kind: 'name-taken', tag: SFX }));
    expect(saved).toEqual([]);
  });

  it('treats a name that differs only by character width as taken', async () => {
    const { tags, saved } = repository([SFX]);

    const created = await createTag({ tags, now: () => 7 }, tagId('b'), 'ｓｆｘ');

    expect(created).toEqual(err({ kind: 'name-taken', tag: SFX }));
    expect(saved).toEqual([]);
  });

  it('reports a failure to read the tags rather than throwing', async () => {
    const { tags } = repository([], 'listing');

    const created = await createTag({ tags, now: () => 7 }, tagId('b'), 'keigo');

    expect(created).toEqual(err({ kind: 'storage-unavailable' }));
  });

  it('reports a failure to store the tag rather than throwing', async () => {
    const { tags } = repository([], 'saving');

    const created = await createTag({ tags, now: () => 7 }, tagId('b'), 'keigo');

    expect(created).toEqual(err({ kind: 'storage-failed', cause: 'the disk is full' }));
  });
});
