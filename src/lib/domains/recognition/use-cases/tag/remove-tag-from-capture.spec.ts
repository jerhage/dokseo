import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { removeTagFromCapture } from './remove-tag-from-capture';

const BOOK = bookId('book-one');

const SFX = tagId('sfx');

const KEIGO = tagId('keigo');

const TAGGED: Capture = {
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
  tagIds: [SFX, KEIGO],
};

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

describe('removeTagFromCapture', () => {
  it('stores the capture without the tag it was given', async () => {
    const { captures, saved } = repository();

    const untagged = await removeTagFromCapture({ captures }, TAGGED, SFX);

    expect(untagged.kind === 'success' && untagged.capture.tagIds).toEqual([KEIGO]);
    expect(at(saved, 0).tagIds).toEqual([KEIGO]);
    expect(at(saved, 0).id).toBe(TAGGED.id);
  });

  it('keeps the moment the reader last edited the text', async () => {
    const { captures, saved } = repository();

    await removeTagFromCapture({ captures }, TAGGED, SFX);

    expect(at(saved, 0).editedAt).toBeNull();
  });

  it('reports a browser that blocks storage', async () => {
    const { captures } = repository(true);

    const untagged = await removeTagFromCapture({ captures }, TAGGED, SFX);

    expect(untagged).toEqual(STORAGE_UNAVAILABLE);
  });
});
