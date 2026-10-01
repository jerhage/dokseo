import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { QueryFailure } from '$lib/shared/query-failure';
import { err, ok } from '$lib/shared/result';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import type { Capture } from '../domain/capture/capture';
import { taggedCapture, untaggedCapture } from '../domain/tag/capture-tags';
import { namedTag, recolouredTag, renamedTag } from '../domain/tag/tag';
import type { Tag } from '../domain/tag/tag';
import { recognitionKeys } from './recognition-keys';
import {
  addTagMutation,
  createTagMutation,
  deleteTagMutation,
  recolourTagMutation,
  removeTagMutation,
  renameTagMutation,
  tagsQuery,
} from './tag-queries';

const SFX: Tag = namedTag(tagId('sfx'), 'sfx', 'slate', 1);

const CAPTURE: Capture = {
  id: captureId('a'),
  bookId: bookId('one'),
  anchor: regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 10, 10) }]),
  text: '海',
  origin: 'written',
  createdAt: 1,
  editedAt: null,
  tagIds: [],
};

describe('tagsQuery', () => {
  it('resolves every tag', async () => {
    const read = tagsQuery({ listTags: () => Promise.resolve(ok([SFX])) });

    await expect(createTestQueryClient().fetchQuery(read)).resolves.toEqual({
      kind: 'read',
      value: [SFX],
    });
  });

  it('resolves a store the browser blocks as an answer', async () => {
    const read = tagsQuery({
      listTags: () => Promise.resolve(err({ kind: 'storage-unavailable' })),
    });

    await expect(createTestQueryClient().fetchQuery(read)).resolves.toEqual({
      kind: 'storage-unavailable',
    });
  });

  it('rejects a store that failed with the described note', async () => {
    const read = tagsQuery({
      listTags: () => Promise.resolve(err({ kind: 'storage-failed', cause: 'locked' })),
    });

    const failure = await createTestQueryClient()
      .fetchQuery(read)
      .catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(QueryFailure);
    expect(failure).toHaveProperty('message', 'Local storage failed: locked');
  });

  it('files the tags under the recognition root, stale at once', () => {
    const read = tagsQuery({ listTags: () => Promise.resolve(ok([])) });

    expect(read.queryKey).toEqual(recognitionKeys.tags());
    expect(read.queryKey.slice(0, 1)).toEqual(recognitionKeys.all());
    expect(read.staleTime).toBe(0);
  });
});

describe('tag mutations', () => {
  it('creates the tag with the id and name it is given, and answers a taken name as data', async () => {
    const asked: string[] = [];
    const creating = new MutationObserver(
      createTestQueryClient(),
      createTagMutation({
        createTag: (id: TagId, name: string) => {
          asked.push(`${id} ${name}`);
          return Promise.resolve(err({ kind: 'name-taken', tag: SFX }));
        },
      }),
    );

    await expect(creating.mutate({ id: tagId('new'), name: 'sfx' })).resolves.toEqual(
      err({ kind: 'name-taken', tag: SFX }),
    );
    expect(asked).toEqual(['new sfx']);
  });

  it('puts the tag on the capture it names, and takes it off', async () => {
    const adding = new MutationObserver(
      createTestQueryClient(),
      addTagMutation({
        addTagToCapture: (capture, tag) => Promise.resolve(ok(taggedCapture(capture, tag))),
      }),
    );
    const removing = new MutationObserver(
      createTestQueryClient(),
      removeTagMutation({
        removeTagFromCapture: (capture, tag) => Promise.resolve(ok(untaggedCapture(capture, tag))),
      }),
    );

    const added = await adding.mutate({ capture: CAPTURE, tag: SFX.id });
    const taken = await removing.mutate({ capture: { ...CAPTURE, tagIds: [SFX.id] }, tag: SFX.id });

    expect(added.ok && added.value.tagIds).toEqual([SFX.id]);
    expect(taken.ok && taken.value.tagIds).toEqual([]);
  });

  it('renames and recolours the tag it is given', async () => {
    const renaming = new MutationObserver(
      createTestQueryClient(),
      renameTagMutation({ renameTag: (tag, name) => Promise.resolve(ok(renamedTag(tag, name))) }),
    );
    const recolouring = new MutationObserver(
      createTestQueryClient(),
      recolourTagMutation({
        recolourTag: (tag, colour) => Promise.resolve(ok(recolouredTag(tag, colour))),
      }),
    );

    const renamed = await renaming.mutate({ tag: SFX, name: 'sound' });
    const recoloured = await recolouring.mutate({ tag: SFX, colour: 'clay' });

    expect(renamed.ok && renamed.value.name).toBe('sound');
    expect(recoloured.ok && recoloured.value.colour).toBe('clay');
  });

  it('deletes the tag it names and answers how many captures lost it', async () => {
    const deleted: TagId[] = [];
    const removing = new MutationObserver(
      createTestQueryClient(),
      deleteTagMutation({
        deleteTag: (tag) => {
          deleted.push(tag);
          return Promise.resolve(ok(4));
        },
      }),
    );

    await expect(removing.mutate(SFX.id)).resolves.toEqual(ok(4));
    expect(deleted).toEqual([SFX.id]);
  });
});
