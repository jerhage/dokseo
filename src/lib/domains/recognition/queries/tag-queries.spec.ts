import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { readFailed, readReady } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { observedRead } from '$lib/shared/testing/observed-read';
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
  it('readies every tag', async () => {
    const read = tagsQuery({ listTags: () => Promise.resolve({ kind: 'success', tags: [SFX] }) });

    expect(await observedRead(createTestQueryClient(), read)).toEqual(
      readReady({ kind: 'success', tags: [SFX] }),
    );
  });

  it('readies a store the browser blocks as an answer', async () => {
    const read = tagsQuery({
      listTags: () => Promise.resolve(STORAGE_UNAVAILABLE),
    });

    expect(await observedRead(createTestQueryClient(), read)).toEqual(
      readReady({ kind: 'storage-unavailable' }),
    );
  });

  it('fails with the cause of a store that threw', async () => {
    const broken = new Error('locked');
    const read = tagsQuery({ listTags: () => Promise.reject(broken) });

    expect(await observedRead(createTestQueryClient(), read)).toEqual(
      readFailed('Something went wrong: locked'),
    );
  });

  it('files the tags under the recognition root, stale at once', () => {
    const read = tagsQuery({ listTags: () => Promise.resolve({ kind: 'success', tags: [] }) });

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
          return Promise.resolve({ kind: 'name-taken', tag: SFX } as const);
        },
      }),
    );

    await expect(creating.mutate({ id: tagId('new'), name: 'sfx' })).resolves.toEqual({
      kind: 'name-taken',
      tag: SFX,
    });
    expect(asked).toEqual(['new sfx']);
  });

  it('puts the tag on the capture it names, and takes it off', async () => {
    const adding = new MutationObserver(
      createTestQueryClient(),
      addTagMutation({
        addTagToCapture: (capture, tag) =>
          Promise.resolve({ kind: 'success', capture: taggedCapture(capture, tag) } as const),
      }),
    );
    const removing = new MutationObserver(
      createTestQueryClient(),
      removeTagMutation({
        removeTagFromCapture: (capture, tag) =>
          Promise.resolve({ kind: 'success', capture: untaggedCapture(capture, tag) } as const),
      }),
    );

    const added = await adding.mutate({ capture: CAPTURE, tag: SFX.id });
    const taken = await removing.mutate({ capture: { ...CAPTURE, tagIds: [SFX.id] }, tag: SFX.id });

    expect(added.kind === 'success' && added.capture.tagIds).toEqual([SFX.id]);
    expect(taken.kind === 'success' && taken.capture.tagIds).toEqual([]);
  });

  it('renames and recolours the tag it is given', async () => {
    const renaming = new MutationObserver(
      createTestQueryClient(),
      renameTagMutation({
        renameTag: (tag, name) =>
          Promise.resolve({ kind: 'success', tag: renamedTag(tag, name) } as const),
      }),
    );
    const recolouring = new MutationObserver(
      createTestQueryClient(),
      recolourTagMutation({
        recolourTag: (tag, colour) =>
          Promise.resolve({ kind: 'success', tag: recolouredTag(tag, colour) } as const),
      }),
    );

    const renamed = await renaming.mutate({ tag: SFX, name: 'sound' });
    const recoloured = await recolouring.mutate({ tag: SFX, colour: 'clay' });

    expect(renamed.kind === 'success' && renamed.tag.name).toBe('sound');
    expect(recoloured.kind === 'success' && recoloured.tag.colour).toBe('clay');
  });

  it('deletes the tag it names and answers how many captures lost it', async () => {
    const deleted: TagId[] = [];
    const removing = new MutationObserver(
      createTestQueryClient(),
      deleteTagMutation({
        deleteTag: (tag) => {
          deleted.push(tag);
          return Promise.resolve({ kind: 'success', untagged: 4 } as const);
        },
      }),
    );

    await expect(removing.mutate(SFX.id)).resolves.toEqual({ kind: 'success', untagged: 4 });
    expect(deleted).toEqual([SFX.id]);
  });
});
