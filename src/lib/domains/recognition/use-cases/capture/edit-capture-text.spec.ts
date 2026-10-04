import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { editCaptureText } from './edit-capture-text';

const BOOK = bookId('book-one');

const CAPTURE: Capture = takenCapture(
  {
    id: captureId('a'),
    bookId: BOOK,
    anchor: regionAnchor([{ index: imageIndex(13), rect: pageRect(0.01, 0.02, 0.1, 0.04) }]),
    text: 'こっちに来て',
    confidence: null,
    origin: 'recognized',
  },
  1_700_000_000_000,
);

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

describe('editCaptureText', () => {
  it('stores the new text over the record it was given, stamped with its clock', async () => {
    const { captures, saved } = repository();

    const edited = await editCaptureText(
      { captures, now: () => 1_700_000_000_009 },
      CAPTURE,
      'こっちに来い',
    );

    const expected = { ...CAPTURE, text: 'こっちに来い', editedAt: 1_700_000_000_009 };
    expect(edited).toEqual({ kind: 'success', capture: expected });
    expect(saved).toEqual([expected]);
  });

  it('reports a browser that blocks storage', async () => {
    const { captures } = repository(true);

    const edited = await editCaptureText({ captures, now: () => 9 }, CAPTURE, 'べつのことば');

    expect(edited).toEqual(STORAGE_UNAVAILABLE);
  });
});
