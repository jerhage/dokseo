import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';
import { editCaptureText } from './edit-capture-text';

const BOOK = bookId('book-one');

const CAPTURE: Capture = takenCapture(
  {
    id: captureId('a'),
    bookId: BOOK,
    regions: [{ index: imageIndex(13), rect: imageRect(10, 20, 100, 40) }],
    text: 'こっちに来て',
    confidence: null,
  },
  1_700_000_000_000,
);

function repository(broken = false) {
  const saved: Capture[] = [];
  const captures: CaptureRepository = {
    listForBook: (): Promise<Result<readonly Capture[], CaptureError>> =>
      Promise.resolve(ok(saved)),
    listEverything: (): Promise<Result<readonly Capture[], CaptureError>> =>
      Promise.resolve(ok(saved)),
    save: (capture: Capture): Promise<Result<void, CaptureError>> => {
      if (broken) return Promise.resolve(err({ kind: 'storage-unavailable' }));
      saved.push(capture);
      return Promise.resolve(ok(undefined));
    },
    remove: (): Promise<Result<void, CaptureError>> => Promise.resolve(ok(undefined)),
    clearBook: (): Promise<Result<void, CaptureError>> => Promise.resolve(ok(undefined)),
  };

  return { captures, saved };
}

describe('editCaptureText', () => {
  it('stores the new text over the record it was given', async () => {
    const { captures, saved } = repository();

    const edited = await editCaptureText({ captures, now: () => 9 }, CAPTURE, 'こっちに来い');

    expect(edited.ok && edited.value.text).toBe('こっちに来い');
    expect(at(saved, 0).id).toBe(CAPTURE.id);
    expect(at(saved, 0).text).toBe('こっちに来い');
  });

  it('stamps the moment the reader edited it', async () => {
    const { captures, saved } = repository();

    const edited = await editCaptureText({ captures, now: () => 9 }, CAPTURE, 'べつのことば');

    expect(edited.ok && edited.value.editedAt).toBe(9);
    expect(at(saved, 0).editedAt).toBe(9);
  });

  it('keeps the moment the capture was taken', async () => {
    const { captures, saved } = repository();

    await editCaptureText({ captures, now: () => 9 }, CAPTURE, 'べつのことば');

    expect(at(saved, 0).createdAt).toBe(1_700_000_000_000);
  });

  it('keeps the previous text when the edit is blank', async () => {
    const { captures, saved } = repository();

    const edited = await editCaptureText({ captures, now: () => 9 }, CAPTURE, '  ');

    expect(edited.ok && edited.value.text).toBe('こっちに来て');
    expect(at(saved, 0).text).toBe('こっちに来て');
  });

  it('reports a storage failure rather than throwing', async () => {
    const { captures } = repository(true);

    const edited = await editCaptureText({ captures, now: () => 9 }, CAPTURE, 'べつのことば');

    expect(edited).toEqual(err({ kind: 'storage-unavailable' }));
  });
});
