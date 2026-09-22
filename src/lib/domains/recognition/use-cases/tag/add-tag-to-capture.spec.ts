import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';
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

describe('addTagToCapture', () => {
  it('stores the capture carrying the tag it was given', async () => {
    const { captures, saved } = repository();

    const tagged = await addTagToCapture({ captures }, CAPTURE, SFX);

    expect(tagged.ok && tagged.value.tagIds).toEqual([SFX]);
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

    expect(tagged.ok && tagged.value.tagIds).toEqual([SFX]);
    expect(at(saved, 0).tagIds).toEqual([SFX]);
  });

  it('reports a storage failure rather than throwing', async () => {
    const { captures } = repository(true);

    const tagged = await addTagToCapture({ captures }, CAPTURE, SFX);

    expect(tagged).toEqual(err({ kind: 'storage-unavailable' }));
  });
});
