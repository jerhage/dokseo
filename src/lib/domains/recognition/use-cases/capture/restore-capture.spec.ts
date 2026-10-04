import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository, CaptureWrite } from '../../domain/capture/capture-repository';
import { restoreCapture } from './restore-capture';

const removed: Capture = {
  ...takenCapture(
    {
      id: captureId('a'),
      bookId: bookId('book-one'),
      anchor: regionAnchor([{ index: imageIndex(13), rect: pageRect(0.01, 0.02, 0.1, 0.04) }]),
      text: 'こっちに来て',
      confidence: null,
      origin: 'recognized',
    },
    1,
  ),
  tagIds: [tagId('t1')],
};

function repository(outcome: CaptureWrite) {
  const saved: Capture[] = [];
  const captures: CaptureRepository = {
    listForBook: () => Promise.resolve({ kind: 'success' as const, captures: [], unreadable: [] }),
    listEverything: () =>
      Promise.resolve({ kind: 'success' as const, captures: [], unreadable: [] }),
    save: (capture) => {
      saved.push(capture);
      return Promise.resolve(outcome);
    },
    remove: () => Promise.resolve({ kind: 'success' as const }),
    clearBook: () => Promise.resolve({ kind: 'success' as const }),
    moveBook: () => Promise.resolve({ kind: 'success' as const }),
    untagEverywhere: () => Promise.reject(new Error('not used')),
  };
  return { captures, saved };
}

describe('restoreCapture', () => {
  it('stores the removed record as it was, id, tags and creation time included', async () => {
    const { captures, saved } = repository({ kind: 'success' as const });

    const restored = await restoreCapture({ captures }, removed);

    expect(restored).toEqual({ kind: 'success' });
    expect(saved).toEqual([removed]);
  });

  it('reports a browser that blocks storage', async () => {
    const { captures } = repository(STORAGE_UNAVAILABLE);

    expect(await restoreCapture({ captures }, removed)).toEqual(STORAGE_UNAVAILABLE);
  });
});
