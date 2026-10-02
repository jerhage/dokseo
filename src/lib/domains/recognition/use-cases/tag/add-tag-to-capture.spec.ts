import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { addTagToCapture } from './add-tag-to-capture';

const BOOK = bookId('book-one');

const SFX = tagId('sfx');

const CAPTURE: Capture = {
  ...takenCapture(
    {
      id: captureId('a'),
      bookId: BOOK,
      anchor: regionAnchor([{ index: imageIndex(13), rect: imageRect(10, 20, 100, 40) }]),
      text: 'こっちに来て',
      confidence: null,
      origin: 'recognized',
    },
    1_700_000_000_000,
  ),
  editedAt: 1_700_000_500_000,
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
  };

  return { captures, saved };
}

describe('addTagToCapture', () => {
  it('stores the capture carrying the tag it was given, keeping when it was last edited', async () => {
    const { captures, saved } = repository();

    const tagged = await addTagToCapture({ captures }, CAPTURE, SFX);

    const expected = { ...CAPTURE, tagIds: [SFX] };
    expect(tagged).toEqual({ kind: 'success', capture: expected });
    expect(saved).toEqual([expected]);
  });

  it('reports a browser that blocks storage', async () => {
    const { captures } = repository(true);

    const tagged = await addTagToCapture({ captures }, CAPTURE, SFX);

    expect(tagged).toEqual(STORAGE_UNAVAILABLE);
  });
});
