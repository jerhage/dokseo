import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { editCaptureText } from './edit-capture-text';

const BOOK = bookId('book-one');

const CAPTURE: Capture = takenCapture(
  {
    id: captureId('a'),
    bookId: BOOK,
    anchor: regionAnchor([{ index: imageIndex(13), rect: imageRect(10, 20, 100, 40) }]),
    text: 'こっちに来て',
    confidence: null,
    origin: 'recognized',
  },
  1_700_000_000_000,
);

function repository(broken = false) {
  const saved: Capture[] = [];
  const captures: CaptureRepository = {
    listForBook: () => Promise.resolve({ kind: 'success' as const, captures: saved }),
    listEverything: () => Promise.resolve({ kind: 'success' as const, captures: saved }),
    save: (capture: Capture) => {
      if (broken) return Promise.resolve(STORAGE_UNAVAILABLE);
      saved.push(capture);
      return Promise.resolve({ kind: 'success' as const });
    },
    remove: () => Promise.resolve({ kind: 'success' as const }),
    clearBook: () => Promise.resolve({ kind: 'success' as const }),
  };

  return { captures, saved };
}

describe('editCaptureText', () => {
  it('stores the new text over the record it was given', async () => {
    const { captures, saved } = repository();

    const edited = await editCaptureText({ captures, now: () => 9 }, CAPTURE, 'こっちに来い');

    expect(edited.kind === 'success' && edited.capture.text).toBe('こっちに来い');
    expect(at(saved, 0).id).toBe(CAPTURE.id);
    expect(at(saved, 0).text).toBe('こっちに来い');
  });

  it('stamps the moment the reader edited it', async () => {
    const { captures, saved } = repository();

    const edited = await editCaptureText({ captures, now: () => 9 }, CAPTURE, 'べつのことば');

    expect(edited.kind === 'success' && edited.capture.editedAt).toBe(9);
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

    expect(edited.kind === 'success' && edited.capture.text).toBe('こっちに来て');
    expect(at(saved, 0).text).toBe('こっちに来て');
  });

  it('reports a browser that blocks storage', async () => {
    const { captures } = repository(true);

    const edited = await editCaptureText({ captures, now: () => 9 }, CAPTURE, 'べつのことば');

    expect(edited).toEqual(STORAGE_UNAVAILABLE);
  });
});
