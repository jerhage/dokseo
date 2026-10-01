import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { writeNote } from './write-note';

const BOOK = bookId('book-one');

const NOTE = captureId('a');

const REGIONS: readonly ImageRegion[] = [
  { index: imageIndex(13), rect: imageRect(10, 20, 100, 40) },
];

const ANCHOR: Anchor = regionAnchor(REGIONS);

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

describe('writeNote', () => {
  it('marks the capture as written rather than recognized', async () => {
    const { captures, saved } = repository();

    const written = await writeNote({ captures, now: () => 5 }, NOTE, BOOK, ANCHOR);

    expect(written.kind === 'success' && written.capture.origin).toBe('written');
    expect(at(saved, 0).origin).toBe('written');
  });

  it('starts the note empty, with no confidence to report', async () => {
    const { captures } = repository();

    const written = await writeNote({ captures, now: () => 5 }, NOTE, BOOK, ANCHOR);

    expect(written.kind === 'success' && written.capture.text).toBe('');
    expect(written.kind === 'success' && 'confidence' in written.capture).toBe(false);
  });

  it('keeps the book, the id and the anchor it was given', async () => {
    const { captures, saved } = repository();

    await writeNote({ captures, now: () => 5 }, NOTE, BOOK, ANCHOR);

    expect(at(saved, 0).id).toBe(NOTE);
    expect(at(saved, 0).bookId).toBe(BOOK);
    expect(at(saved, 0).anchor).toEqual(ANCHOR);
  });

  it('stamps the note with the clock it was given, unedited', async () => {
    const { captures, saved } = repository();

    const written = await writeNote({ captures, now: () => 1_700_000_000_000 }, NOTE, BOOK, ANCHOR);

    expect(written.kind === 'success' && written.capture.createdAt).toBe(1_700_000_000_000);
    expect(at(saved, 0).editedAt).toBeNull();
  });

  it('reports a browser that blocks storage', async () => {
    const { captures } = repository(true);

    const written = await writeNote({ captures, now: () => 5 }, NOTE, BOOK, ANCHOR);

    expect(written).toEqual(STORAGE_UNAVAILABLE);
  });
});
