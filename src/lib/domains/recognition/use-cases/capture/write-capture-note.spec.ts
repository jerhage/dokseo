import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import type { Capture, RecognizedCapture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';
import { writeCaptureNote } from './write-capture-note';

const BOOK = bookId('book-one');

const CAPTURE: RecognizedCapture = {
  id: captureId('a'),
  bookId: BOOK,
  regions: [{ index: imageIndex(13), rect: imageRect(10, 20, 100, 40) }],
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

function storedNote(saved: readonly Capture[]): string | null {
  const row = at(saved, 0);
  return row.origin === 'written' ? null : row.note;
}

describe('writeCaptureNote', () => {
  it('stores the note over the record it was given and returns it', async () => {
    const { captures, saved } = repository();

    const noted = await writeCaptureNote({ captures }, CAPTURE, '  he means his sister  ');

    expect(noted.ok && noted.value.note).toBe('he means his sister');
    expect(at(saved, 0).id).toBe(CAPTURE.id);
    expect(storedNote(saved)).toBe('he means his sister');
  });

  it('stores no note when the reader leaves it blank', async () => {
    const { captures, saved } = repository();

    const noted = await writeCaptureNote({ captures }, { ...CAPTURE, note: 'an old thought' }, ' ');

    expect(noted.ok && noted.value.note).toBeNull();
    expect(storedNote(saved)).toBeNull();
  });

  it('keeps the recognized text and the moment the capture was edited', async () => {
    const { captures, saved } = repository();

    await writeCaptureNote({ captures }, CAPTURE, 'my own words');

    expect(at(saved, 0).text).toBe('こっちに来て');
    expect(at(saved, 0).editedAt).toBe(88);
    expect(at(saved, 0).createdAt).toBe(1_700_000_000_000);
  });

  it('reports a storage failure rather than throwing', async () => {
    const { captures } = repository(true);

    const noted = await writeCaptureNote({ captures }, CAPTURE, 'my own words');

    expect(noted).toEqual(err({ kind: 'storage-unavailable' }));
  });
});
