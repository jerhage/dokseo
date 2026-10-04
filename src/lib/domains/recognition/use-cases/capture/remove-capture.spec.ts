import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { CaptureId } from '$lib/shared/ids';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { removeCapture } from './remove-capture';

const BOOK = bookId('book-one');

function stored(id: string): Capture {
  return takenCapture(
    {
      id: captureId(id),
      bookId: BOOK,
      anchor: regionAnchor([{ index: imageIndex(13), rect: imageRect(10, 20, 100, 40) }]),
      text: 'こっちに来て',
      confidence: null,
      origin: 'recognized',
    },
    1,
  );
}

function repository(broken = false) {
  let rows: Capture[] = [stored('a'), stored('b')];
  const captures: CaptureRepository = {
    listForBook: () =>
      Promise.resolve({ kind: 'success' as const, captures: rows, unreadable: [] }),
    listEverything: () =>
      Promise.resolve({ kind: 'success' as const, captures: rows, unreadable: [] }),
    save: () => Promise.resolve({ kind: 'success' as const }),
    remove: (capture: CaptureId) => {
      if (broken) {
        return Promise.resolve(STORAGE_UNAVAILABLE);
      }
      rows = rows.filter((row) => row.id !== capture);
      return Promise.resolve({ kind: 'success' as const });
    },
    clearBook: () => Promise.resolve({ kind: 'success' as const }),
    moveBook: () => Promise.resolve({ kind: 'success' as const }),
    untagEverywhere: () => Promise.reject(new Error('not used')),
  };

  return { captures, remaining: () => rows.map((row) => row.id) };
}

describe('removeCapture', () => {
  it('drops the named capture and leaves every other one', async () => {
    const { captures, remaining } = repository();

    const removed = await removeCapture({ captures }, captureId('a'));

    expect(removed).toEqual({ kind: 'success' as const });
    expect(remaining()).toEqual(['b']);
  });

  it('reports a browser that blocks storage', async () => {
    const { captures } = repository(true);

    const removed = await removeCapture({ captures }, captureId('a'));

    expect(removed).toEqual(STORAGE_UNAVAILABLE);
  });
});
