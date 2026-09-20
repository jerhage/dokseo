import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { err, ok, type Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';
import { saveCapture } from './save-capture';

const BOOK = bookId('book-one');

const DRAFT: CaptureDraft = {
  id: captureId('a'),
  bookId: BOOK,
  regions: [{ index: imageIndex(13), rect: imageRect(10, 20, 100, 40) }],
  text: 'こっちに来て',
  confidence: null,
};

function repository(broken = false) {
  const saved: Capture[] = [];
  const captures: CaptureRepository = {
    listForBook: (): Promise<Result<readonly Capture[], CaptureError>> =>
      Promise.resolve(ok(saved)),
    listEverything: (): Promise<Result<readonly Capture[], CaptureError>> =>
      Promise.resolve(ok(saved)),
    save: (capture: Capture): Promise<Result<void, CaptureError>> => {
      if (broken)
        return Promise.resolve(err({ kind: 'storage-failed', cause: 'the disk is full' }));
      saved.push(capture);
      return Promise.resolve(ok(undefined));
    },
    remove: (): Promise<Result<void, CaptureError>> => Promise.resolve(ok(undefined)),
    clearBook: (): Promise<Result<void, CaptureError>> => Promise.resolve(ok(undefined)),
  };

  return { captures, saved };
}

describe('saveCapture', () => {
  it('stamps the capture with the clock it was given', async () => {
    const { captures, saved } = repository();

    const stored = await saveCapture({ captures, now: () => 1_700_000_000_000 }, DRAFT);

    expect(stored.ok && stored.value.createdAt).toBe(1_700_000_000_000);
    expect(at(saved, 0).createdAt).toBe(1_700_000_000_000);
    expect(at(saved, 0).bookId).toBe(BOOK);
  });

  it('reports the capture it stored, marked as never edited', async () => {
    const { captures } = repository();

    const stored = await saveCapture({ captures, now: () => 5 }, DRAFT);

    expect(stored.ok && stored.value.text).toBe('こっちに来て');
    expect(stored.ok && stored.value.editedAt).toBeNull();
  });

  it('reports a storage failure rather than throwing', async () => {
    const { captures } = repository(true);

    const stored = await saveCapture({ captures, now: () => 1 }, DRAFT);

    expect(stored).toEqual(err({ kind: 'storage-failed', cause: 'the disk is full' }));
  });
});
