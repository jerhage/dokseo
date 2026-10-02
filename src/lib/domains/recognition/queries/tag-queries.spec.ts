import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { readReady } from '$lib/shared/read-state';
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
    const read = tagsQuery({
      listTags: () => Promise.resolve({ kind: 'success', tags: [SFX], unreadable: [] }),
    });

    expect(await observedRead(createTestQueryClient(), read)).toEqual(
      readReady({ kind: 'success', tags: [SFX], unreadable: [] }),
    );
  });

  it('files the tags under the recognition root, stale at once', () => {
    const read = tagsQuery({
      listTags: () => Promise.resolve({ kind: 'success', tags: [], unreadable: [] }),
    });

    expect(read.queryKey).toEqual(recognitionKeys.tags());
    expect(read.queryKey.slice(0, 1)).toEqual(recognitionKeys.all());
    expect(read.staleTime).toBe(0);
  });
});

describe('tag mutations', () => {
  it('hands each use case what the write names, and answers what it answered', async () => {
    const asked: string[] = [];
    const created = await new MutationObserver(
      createTestQueryClient(),
      createTagMutation({
        createTag: (id: TagId, name: string) => {
          asked.push(`create ${id} ${name}`);
          return Promise.resolve({ kind: 'name-taken', tag: SFX } as const);
        },
      }),
    ).mutate({ id: tagId('new'), name: 'sfx' });
    const added = await new MutationObserver(
      createTestQueryClient(),
      addTagMutation({
        addTagToCapture: (capture, tag) => {
          asked.push(`add ${capture.id} ${tag}`);
          return Promise.resolve({
            kind: 'success',
            capture: taggedCapture(capture, tag),
          } as const);
        },
      }),
    ).mutate({ capture: CAPTURE, tag: SFX.id });
    const taken = await new MutationObserver(
      createTestQueryClient(),
      removeTagMutation({
        removeTagFromCapture: (capture, tag) => {
          asked.push(`remove ${capture.id} ${tag}`);
          return Promise.resolve({
            kind: 'success',
            capture: untaggedCapture(capture, tag),
          } as const);
        },
      }),
    ).mutate({ capture: { ...CAPTURE, tagIds: [SFX.id] }, tag: SFX.id });
    const renamed = await new MutationObserver(
      createTestQueryClient(),
      renameTagMutation({
        renameTag: (tag, name) => {
          asked.push(`rename ${tag.id} ${name}`);
          return Promise.resolve({ kind: 'success', tag: renamedTag(tag, name) } as const);
        },
      }),
    ).mutate({ tag: SFX, name: 'sound' });
    const recoloured = await new MutationObserver(
      createTestQueryClient(),
      recolourTagMutation({
        recolourTag: (tag, colour) => {
          asked.push(`recolour ${tag.id} ${colour}`);
          return Promise.resolve({ kind: 'success', tag: recolouredTag(tag, colour) } as const);
        },
      }),
    ).mutate({ tag: SFX, colour: 'clay' });
    const deleted = await new MutationObserver(
      createTestQueryClient(),
      deleteTagMutation({
        deleteTag: (tag) => {
          asked.push(`delete ${tag}`);
          return Promise.resolve({ kind: 'success', untagged: 4 } as const);
        },
      }),
    ).mutate(SFX.id);

    expect(asked).toEqual([
      'create new sfx',
      'add a sfx',
      'remove a sfx',
      'rename sfx sound',
      'recolour sfx clay',
      'delete sfx',
    ]);
    expect(created).toEqual({ kind: 'name-taken', tag: SFX });
    expect(added.kind === 'success' && added.capture.tagIds).toEqual([SFX.id]);
    expect(taken.kind === 'success' && taken.capture.tagIds).toEqual([]);
    expect(renamed.kind === 'success' && renamed.tag.name).toBe('sound');
    expect(recoloured.kind === 'success' && recoloured.tag.colour).toBe('clay');
    expect(deleted).toEqual({ kind: 'success', untagged: 4 });
  });
});
