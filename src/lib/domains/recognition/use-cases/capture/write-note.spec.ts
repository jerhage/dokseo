import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { writeNote } from './write-note';

const BOOK = bookId('book-one');

const NOTE = captureId('a');

const REGIONS: readonly ImageRegion[] = [
  { index: imageIndex(13), rect: pageRect(0.01, 0.02, 0.1, 0.04) },
];

const ANCHOR: Anchor = regionAnchor(REGIONS);

function repository(broken = false) {
  const saved: Capture[] = [];
  const captures: CaptureRepository = {
    listForBook: () =>
      Promise.resolve({ kind: 'success' as const, captures: saved, unreadable: [] }),
    listEverything: () =>
      Promise.resolve({ kind: 'success' as const, captures: saved, unreadable: [] }),
    save: (capture: Capture) => {
      if (broken) return Promise.resolve(STORAGE_UNAVAILABLE);
      saved.push(capture);
      return Promise.resolve({ kind: 'success' as const });
    },
    remove: () => Promise.resolve({ kind: 'success' as const }),
    clearBook: () => Promise.resolve({ kind: 'success' as const }),
    moveBook: () => Promise.resolve({ kind: 'success' as const }),
    untagEverywhere: () => Promise.reject(new Error('not used')),
  };

  return { captures, saved };
}

describe('writeNote', () => {
  it('stores an empty written note on the book, id and anchor it was given, unedited', async () => {
    const { captures, saved } = repository();

    const written = await writeNote({ captures, now: () => 1_700_000_000_000 }, NOTE, BOOK, ANCHOR);

    const expected = {
      id: NOTE,
      bookId: BOOK,
      anchor: ANCHOR,
      text: '',
      origin: 'written',
      createdAt: 1_700_000_000_000,
      editedAt: null,
      tagIds: [],
    };
    expect(written).toStrictEqual({ kind: 'success', capture: expected });
    expect(saved).toStrictEqual([expected]);
  });

  it('reports a browser that blocks storage', async () => {
    const { captures } = repository(true);

    const written = await writeNote({ captures, now: () => 5 }, NOTE, BOOK, ANCHOR);

    expect(written).toEqual(STORAGE_UNAVAILABLE);
  });
});
