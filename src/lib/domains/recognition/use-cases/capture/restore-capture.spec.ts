import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';
import { restoreCapture } from './restore-capture';

const removed: Capture = {
  ...takenCapture(
    {
      id: captureId('a'),
      bookId: bookId('book-one'),
      anchor: regionAnchor([{ index: imageIndex(13), rect: imageRect(10, 20, 100, 40) }]),
      text: 'こっちに来て',
      confidence: null,
      origin: 'recognized',
    },
    1,
  ),
  tagIds: [tagId('t1')],
};

function repository(outcome: Result<void, CaptureError>) {
  const saved: Capture[] = [];
  const captures: CaptureRepository = {
    listForBook: () => Promise.resolve(ok([])),
    listEverything: () => Promise.resolve(ok([])),
    save: (capture) => {
      saved.push(capture);
      return Promise.resolve(outcome);
    },
    remove: () => Promise.resolve(ok(undefined)),
    clearBook: () => Promise.resolve(ok(undefined)),
  };
  return { captures, saved };
}

describe('restoreCapture', () => {
  it('stores the removed record as it was, id, tags and creation time included', async () => {
    const { captures, saved } = repository(ok(undefined));

    const restored = await restoreCapture({ captures }, removed);

    expect(restored).toEqual(ok(undefined));
    expect(saved).toEqual([removed]);
  });

  it('returns what the repository returned', async () => {
    const failed = err({ kind: 'storage-failed', cause: 'the store is blocked' } as const);
    const { captures } = repository(failed);

    expect(await restoreCapture({ captures }, removed)).toEqual(failed);
  });
});
