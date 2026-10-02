import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import type { TagRepository } from '../../domain/tag/tag-repository';
import { removeUnreadableTags } from './remove-unreadable-tags';

const NAMELESS = tagId('nameless');
const UNDATED = tagId('undated');
const KEIGO = tagId('keigo');

function capture(id: string, tagIds: readonly TagId[]): Capture {
  return {
    ...takenCapture(
      {
        id: captureId(id),
        bookId: bookId('book-one'),
        anchor: regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 10, 10) }]),
        text: '海',
        confidence: null,
        origin: 'recognized',
      },
      1,
    ),
    tagIds,
  };
}

function stores(rows: readonly Capture[], failAt: TagId | null = null) {
  const saved: Capture[] = [];
  const removed: TagId[] = [];

  const captures: CaptureRepository = {
    listForBook: () =>
      Promise.resolve({ kind: 'success' as const, captures: rows, unreadable: [] }),
    listEverything: () =>
      Promise.resolve({ kind: 'success' as const, captures: rows, unreadable: [] }),
    save: (edited: Capture) => {
      saved.push(edited);
      return Promise.resolve({ kind: 'success' as const });
    },
    remove: () => Promise.resolve({ kind: 'success' as const }),
    clearBook: () => Promise.resolve({ kind: 'success' as const }),
    moveBook: () => Promise.resolve({ kind: 'success' as const }),
  };

  const tags: TagRepository = {
    list: () => Promise.reject(new Error('the removal read a tag row')),
    save: () => Promise.resolve({ kind: 'success' as const }),
    remove: (tag: TagId) => {
      if (tag === failAt) return Promise.resolve(STORAGE_UNAVAILABLE);
      removed.push(tag);
      return Promise.resolve({ kind: 'success' as const });
    },
  };

  return { captures, tags, saved, removed };
}

describe('removeUnreadableTags', () => {
  it('deletes each tag by its id alone and takes it off every capture carrying it', async () => {
    const { captures, tags, saved, removed } = stores([
      capture('a', [NAMELESS, KEIGO]),
      capture('b', [KEIGO]),
    ]);

    const outcome = await removeUnreadableTags({ captures, tags }, [NAMELESS, UNDATED]);

    expect(outcome).toEqual({ kind: 'success' });
    expect(removed).toEqual([NAMELESS, UNDATED]);
    expect(saved.map((row) => [row.id, row.tagIds])).toEqual([['a', [KEIGO]]]);
  });

  it('stops at the first tag storage refuses and reports it', async () => {
    const { captures, tags, removed } = stores([], NAMELESS);

    const outcome = await removeUnreadableTags({ captures, tags }, [NAMELESS, UNDATED]);

    expect(outcome).toEqual(STORAGE_UNAVAILABLE);
    expect(removed).toEqual([]);
  });
});
