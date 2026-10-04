import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { Capture, RecognizedCapture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { writeCaptureNote } from './write-capture-note';

const BOOK = bookId('book-one');

const CAPTURE: RecognizedCapture = {
  id: captureId('a'),
  bookId: BOOK,
  anchor: regionAnchor([{ index: imageIndex(13), rect: pageRect(0.01, 0.02, 0.1, 0.04) }]),
  text: 'こっちに来て',
  note: null,
  confidence: null,
  origin: 'recognized',
  createdAt: 1_700_000_000_000,
  editedAt: 88,
  tagIds: [],
};

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

describe('writeCaptureNote', () => {
  it('stores the note over the record it was given and returns it', async () => {
    const { captures, saved } = repository();

    const noted = await writeCaptureNote({ captures }, CAPTURE, '  he means his sister  ');

    const expected = { ...CAPTURE, note: 'he means his sister' };
    expect(noted).toEqual({ kind: 'success', capture: expected });
    expect(saved).toEqual([expected]);
  });

  it('reports a browser that blocks storage', async () => {
    const { captures } = repository(true);

    const noted = await writeCaptureNote({ captures }, CAPTURE, 'my own words');

    expect(noted).toEqual(STORAGE_UNAVAILABLE);
  });
});
