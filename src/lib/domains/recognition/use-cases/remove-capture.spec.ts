import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { err, ok, type Result } from '$lib/shared/result';
import type { CaptureId } from '$lib/shared/ids';
import { takenCapture, type Capture } from '../domain/capture';
import type { CaptureError, CaptureRepository } from '../domain/capture-repository';
import { removeCapture } from './remove-capture';

const BOOK = bookId('book-one');

function stored(id: string): Capture {
  return takenCapture(
    {
      id: captureId(id),
      bookId: BOOK,
      regions: [{ index: imageIndex(13), rect: imageRect(10, 20, 100, 40) }],
      text: 'こっちに来て',
      confidence: null,
    },
    1,
  );
}

function repository(broken = false) {
  let rows: Capture[] = [stored('a'), stored('b')];
  const captures: CaptureRepository = {
    listForBook: (): Promise<Result<readonly Capture[], CaptureError>> => Promise.resolve(ok(rows)),
    listEverything: (): Promise<Result<readonly Capture[], CaptureError>> =>
      Promise.resolve(ok(rows)),
    save: (): Promise<Result<void, CaptureError>> => Promise.resolve(ok(undefined)),
    remove: (capture: CaptureId): Promise<Result<void, CaptureError>> => {
      if (broken) {
        return Promise.resolve(err({ kind: 'storage-failed', cause: 'the store is blocked' }));
      }
      rows = rows.filter((row) => row.id !== capture);
      return Promise.resolve(ok(undefined));
    },
    clearBook: (): Promise<Result<void, CaptureError>> => Promise.resolve(ok(undefined)),
  };

  return { captures, remaining: () => rows.map((row) => row.id) };
}

describe('removeCapture', () => {
  it('drops the named capture and leaves every other one', async () => {
    const { captures, remaining } = repository();

    const removed = await removeCapture({ captures }, captureId('a'));

    expect(removed).toEqual(ok(undefined));
    expect(remaining()).toEqual(['b']);
  });

  it('reports a storage failure rather than throwing', async () => {
    const { captures } = repository(true);

    const removed = await removeCapture({ captures }, captureId('a'));

    expect(removed).toEqual(err({ kind: 'storage-failed', cause: 'the store is blocked' }));
  });
});
