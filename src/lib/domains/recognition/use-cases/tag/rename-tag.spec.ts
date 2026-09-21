import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagError, TagRepository } from '../../domain/tag/tag-repository';
import { renameTag } from './rename-tag';

type StoreFault = 'none' | 'listing' | 'saving';

const SFX = namedTag(tagId('a'), 'sfx', 'slate', 1);
const KEIGO = namedTag(tagId('b'), 'keigo', 'clay', 2);

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

describe('renameTag', () => {
  it('stores the name trimmed and its inner spaces collapsed', async () => {
    const { tags, saved } = repository([SFX]);

    const renamed = await renameTag({ tags }, SFX, '  sound   effects ');

    expect(renamed.ok && renamed.value.name).toBe('sound effects');
    expect(at(saved, 0).name).toBe('sound effects');
  });

  it('keeps the tag its id, its colour and the moment it was made', async () => {
    const { tags, saved } = repository([SFX]);

    await renameTag({ tags }, SFX, 'sound effects');

    expect(at(saved, 0).id).toBe(SFX.id);
    expect(at(saved, 0).colour).toBe('slate');
    expect(at(saved, 0).createdAt).toBe(1);
  });

  it('lets a tag keep the name it already holds', async () => {
    const { tags, saved } = repository([SFX, KEIGO]);

    const renamed = await renameTag({ tags }, SFX, 'sfx');

    expect(renamed.ok && renamed.value.name).toBe('sfx');
    expect(at(saved, 0).name).toBe('sfx');
  });

  it('lets a tag recase its own name', async () => {
    const { tags, saved } = repository([SFX, KEIGO]);

    const renamed = await renameTag({ tags }, SFX, 'SFX');

    expect(renamed.ok && renamed.value.name).toBe('SFX');
    expect(at(saved, 0).name).toBe('SFX');
  });

  it('lets a tag respace its own name', async () => {
    const spaced = namedTag(tagId('c'), 'grammar to ask', 'sage', 3);
    const { tags, saved } = repository([spaced, KEIGO]);

    const renamed = await renameTag({ tags }, spaced, ' grammar    to ask ');

    expect(renamed.ok && renamed.value.name).toBe('grammar to ask');
    expect(at(saved, 0).name).toBe('grammar to ask');
  });

  it('reports the other tag and writes nothing when it already holds the name', async () => {
    const { tags, saved } = repository([SFX, KEIGO]);

    const renamed = await renameTag({ tags }, SFX, 'keigo');

    expect(renamed).toEqual(err({ kind: 'name-taken', tag: KEIGO }));
    expect(saved).toEqual([]);
  });

  it('reports a name another tag holds in another case as taken', async () => {
    const { tags, saved } = repository([SFX, KEIGO]);

    const renamed = await renameTag({ tags }, SFX, 'Keigo');

    expect(renamed).toEqual(err({ kind: 'name-taken', tag: KEIGO }));
    expect(saved).toEqual([]);
  });

  it('reports a name another tag holds in another character width as taken', async () => {
    const { tags, saved } = repository([SFX, KEIGO]);

    const renamed = await renameTag({ tags }, SFX, 'ｋｅｉｇｏ');

    expect(renamed).toEqual(err({ kind: 'name-taken', tag: KEIGO }));
    expect(saved).toEqual([]);
  });

  it('reports a failure to read the tags rather than throwing', async () => {
    const { tags } = repository([SFX], 'listing');

    const renamed = await renameTag({ tags }, SFX, 'sound effects');

    expect(renamed).toEqual(err({ kind: 'storage-unavailable' }));
  });

  it('reports a failure to store the tag rather than throwing', async () => {
    const { tags } = repository([SFX], 'saving');

    const renamed = await renameTag({ tags }, SFX, 'sound effects');

    expect(renamed).toEqual(err({ kind: 'storage-failed', cause: 'the disk is full' }));
  });
});
