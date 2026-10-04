import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { saveCapture } from './save-capture';

const BOOK = bookId('book-one');

const DRAFT: CaptureDraft = {
  id: captureId('a'),
  bookId: BOOK,
  anchor: regionAnchor([{ index: imageIndex(13), rect: imageRect(10, 20, 100, 40) }]),
  text: 'こっちに来て',
  confidence: null,
  origin: 'recognized',
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

describe('saveCapture', () => {
  it('stamps the capture with the clock it was given, never edited', async () => {
    const { captures, saved } = repository();

    const stored = await saveCapture({ captures, now: () => 1_700_000_000_000 }, DRAFT);

    const expected = {
      ...DRAFT,
      note: null,
      createdAt: 1_700_000_000_000,
      editedAt: null,
      tagIds: [],
    };
    expect(stored).toEqual({ kind: 'success', capture: expected });
    expect(saved).toEqual([expected]);
  });

  it('reports a browser that blocks storage', async () => {
    const { captures } = repository(true);

    const stored = await saveCapture({ captures, now: () => 1 }, DRAFT);

    expect(stored).toEqual(STORAGE_UNAVAILABLE);
  });
});
