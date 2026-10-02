import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { TagId } from '$lib/shared/ids';
import { at } from '$lib/shared/testing/at';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import type { TagRepository } from '../../domain/tag/tag-repository';
import { deleteTag } from './delete-tag';

type StoreFault = 'none' | 'listing' | 'saving' | 'removing';

const BOOK = bookId('book-one');

const SFX = tagId('sfx');
const KEIGO = tagId('keigo');

function capture(id: string, tagIds: readonly TagId[]): Capture {
  return {
    ...takenCapture(
      {
        id: captureId(id),
        bookId: BOOK,
        anchor: regionAnchor([{ index: imageIndex(13), rect: imageRect(10, 20, 100, 40) }]),
        text: 'こっちに来て',
        confidence: null,
        origin: 'recognized',
      },
      1_700_000_000_000,
    ),
    tagIds,
  };
}

function stores(rows: readonly Capture[], fault: StoreFault = 'none') {
  const saved: Capture[] = [];
  const removed: TagId[] = [];

  const captures: CaptureRepository = {
    listForBook: () =>
      Promise.resolve({ kind: 'success' as const, captures: rows, unreadable: [] }),
    listEverything: () => {
      if (fault === 'listing') return Promise.resolve(STORAGE_UNAVAILABLE);
      return Promise.resolve({ kind: 'success' as const, captures: rows, unreadable: [] });
    },
    save: (edited: Capture) => {
      if (fault === 'saving') {
        return Promise.resolve(STORAGE_UNAVAILABLE);
      }
      saved.push(edited);
      return Promise.resolve({ kind: 'success' as const });
    },
    remove: () => Promise.resolve({ kind: 'success' as const }),
    clearBook: () => Promise.resolve({ kind: 'success' as const }),
  };

  const tags: TagRepository = {
    list: () => Promise.resolve({ kind: 'success' as const, tags: [], unreadable: [] }),
    save: () => Promise.resolve({ kind: 'success' as const }),
    remove: (tag: TagId) => {
      if (fault === 'removing') return Promise.resolve(STORAGE_UNAVAILABLE);
      removed.push(tag);
      return Promise.resolve({ kind: 'success' as const });
    },
  };

  return { captures, tags, saved, removed };
}

describe('deleteTag', () => {
  it('strips the tag from every capture carrying it and removes the record', async () => {
    const { captures, tags, saved, removed } = stores([
      capture('a', [SFX]),
      capture('b', [KEIGO]),
      capture('c', [SFX, KEIGO]),
    ]);

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual({ kind: 'success', untagged: 2 });
    expect(saved.map((row) => row.id)).toEqual([captureId('a'), captureId('c')]);
    expect(at(saved, 0).tagIds).toEqual([]);
    expect(at(saved, 1).tagIds).toEqual([KEIGO]);
    expect(removed).toEqual([SFX]);
  });

  it('reports no capture lost the tag, writes no capture and still removes the record', async () => {
    const { captures, tags, saved, removed } = stores([capture('b', [KEIGO])]);

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual({ kind: 'success', untagged: 0 });
    expect(saved).toEqual([]);
    expect(removed).toEqual([SFX]);
  });

  it('keeps the tag record when a capture cannot be stripped', async () => {
    const { captures, tags, removed } = stores([capture('a', [SFX])], 'saving');

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual(STORAGE_UNAVAILABLE);
    expect(removed).toEqual([]);
  });

  it('reports a failure to read the captures rather than throwing', async () => {
    const { captures, tags, removed } = stores([capture('a', [SFX])], 'listing');

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual(STORAGE_UNAVAILABLE);
    expect(removed).toEqual([]);
  });

  it('reports a failure to remove the tag record rather than throwing', async () => {
    const { captures, tags, saved } = stores([capture('a', [SFX])], 'removing');

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual(STORAGE_UNAVAILABLE);
    expect(saved.map((row) => row.id)).toEqual([captureId('a')]);
  });
});
