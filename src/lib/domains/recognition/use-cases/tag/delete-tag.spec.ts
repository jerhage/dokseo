import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { TagId } from '$lib/shared/ids';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { untaggedCapture } from '../../domain/tag/capture-tags';
import type { TagRepository } from '../../domain/tag/tag-repository';
import { deleteTag } from './delete-tag';

type StoreFault = 'none' | 'untagging' | 'removing';

const BOOK = bookId('book-one');

const SFX = tagId('sfx');
const KEIGO = tagId('keigo');

function capture(id: string, tagIds: readonly TagId[]): Capture {
  return {
    ...takenCapture(
      {
        id: captureId(id),
        bookId: BOOK,
        anchor: regionAnchor([{ index: imageIndex(13), rect: pageRect(0.01, 0.02, 0.1, 0.04) }]),
        text: 'こっちに来て',
        confidence: null,
        origin: 'recognized',
      },
      1_700_000_000_000,
    ),
    tagIds,
  };
}

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

function stores(rows: readonly Capture[], fault: StoreFault = 'none') {
  const held = new Map(rows.map((row) => [row.id, row]));
  const steps: string[] = [];

  const captures: CaptureRepository = {
    listForBook: notUsed,
    listEverything: notUsed,
    save: notUsed,
    remove: notUsed,
    clearBook: notUsed,
    moveBook: notUsed,
    untagEverywhere: (tag: TagId) => {
      if (fault === 'untagging') return Promise.resolve(STORAGE_UNAVAILABLE);
      const carrying = [...held.values()].filter((row) => row.tagIds.includes(tag));
      for (const row of carrying) held.set(row.id, untaggedCapture(row, tag));
      steps.push(`untagged ${tag}`);
      return Promise.resolve({ kind: 'success' as const, untagged: carrying.length });
    },
  };

  const tags: TagRepository = {
    list: notUsed,
    save: notUsed,
    remove: (tag: TagId) => {
      if (fault === 'removing') return Promise.resolve(STORAGE_UNAVAILABLE);
      steps.push(`removed ${tag}`);
      return Promise.resolve({ kind: 'success' as const });
    },
  };

  return { captures, tags, steps, tagsOf: (id: string) => held.get(captureId(id))?.tagIds };
}

describe('deleteTag', () => {
  it('untags every capture carrying the tag in one step, then removes the record', async () => {
    const { captures, tags, steps, tagsOf } = stores([
      capture('a', [SFX]),
      capture('b', [KEIGO]),
      capture('c', [SFX, KEIGO]),
    ]);

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual({ kind: 'success', untagged: 2 });
    expect(steps).toEqual(['untagged sfx', 'removed sfx']);
    expect([tagsOf('a'), tagsOf('b'), tagsOf('c')]).toEqual([[], [KEIGO], [KEIGO]]);
  });

  it('reports no capture lost the tag and still removes the record', async () => {
    const { captures, tags, steps } = stores([capture('b', [KEIGO])]);

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual({ kind: 'success', untagged: 0 });
    expect(steps).toEqual(['untagged sfx', 'removed sfx']);
  });

  it('keeps the tag record when the captures cannot be untagged', async () => {
    const { captures, tags, steps } = stores([capture('a', [SFX])], 'untagging');

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual(STORAGE_UNAVAILABLE);
    expect(steps).toEqual([]);
  });

  it('reports a failure to remove the tag record rather than throwing', async () => {
    const { captures, tags, steps } = stores([capture('a', [SFX])], 'removing');

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual(STORAGE_UNAVAILABLE);
    expect(steps).toEqual(['untagged sfx']);
  });
});
