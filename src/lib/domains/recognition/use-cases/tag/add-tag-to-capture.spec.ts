import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { addTagToCapture } from './add-tag-to-capture';

const BOOK = bookId('book-one');

const SFX = tagId('sfx');

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

describe('addTagToCapture', () => {
  it('stores the capture carrying the tag it was given', async () => {
    const { captures, saved } = repository();

    const tagged = await addTagToCapture({ captures }, CAPTURE, SFX);

    expect(tagged.kind === 'success' && tagged.capture.tagIds).toEqual([SFX]);
    expect(at(saved, 0).tagIds).toEqual([SFX]);
    expect(at(saved, 0).id).toBe(CAPTURE.id);
  });

  it('keeps the moment the reader last edited the text', async () => {
    const { captures, saved } = repository();

    await addTagToCapture({ captures }, CAPTURE, SFX);

    expect(at(saved, 0).editedAt).toBeNull();
  });

  it('stores one tag only when the capture already carries it', async () => {
    const { captures, saved } = repository();
    const already: Capture = { ...CAPTURE, tagIds: [SFX] };

    const tagged = await addTagToCapture({ captures }, already, SFX);

    expect(tagged.kind === 'success' && tagged.capture.tagIds).toEqual([SFX]);
    expect(at(saved, 0).tagIds).toEqual([SFX]);
  });

  it('reports a browser that blocks storage', async () => {
    const { captures } = repository(true);

    const tagged = await addTagToCapture({ captures }, CAPTURE, SFX);

    expect(tagged).toEqual(STORAGE_UNAVAILABLE);
  });
});
