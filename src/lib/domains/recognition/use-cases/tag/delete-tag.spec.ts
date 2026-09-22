import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { TagId } from '$lib/shared/ids';
import { at } from '$lib/shared/testing/at';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';
import type { Tag } from '../../domain/tag/tag';
import type { TagError, TagRepository } from '../../domain/tag/tag-repository';
import { deleteTag } from './delete-tag';

type StoreFault = 'none' | 'listing' | 'saving' | 'removing';

const BOOK = bookId('book-one');

const SFX = tagId('sfx');
const KEIGO = tagId('keigo');

function capture(id: string, tagIds: readonly TagId[]): Capture {
  return {
    ...takenCapture(
      {
        id: captureId(id),
        bookId: BOOK,
        anchor: regionAnchor([{ index: imageIndex(13), rect: imageRect(10, 20, 100, 40) }]),
        text: 'こっちに来て',
        confidence: null,
        origin: 'recognized',
      },
      1_700_000_000_000,
    ),
    tagIds,
  };
}

function stores(rows: readonly Capture[], fault: StoreFault = 'none') {
  const saved: Capture[] = [];
  const removed: TagId[] = [];

  const captures: CaptureRepository = {
    listForBook: (): Promise<Result<readonly Capture[], CaptureError>> => Promise.resolve(ok(rows)),
    listEverything: (): Promise<Result<readonly Capture[], CaptureError>> => {
      if (fault === 'listing') return Promise.resolve(err({ kind: 'storage-unavailable' }));
      return Promise.resolve(ok(rows));
    },
    save: (edited: Capture): Promise<Result<void, CaptureError>> => {
      if (fault === 'saving') {
        return Promise.resolve(err({ kind: 'storage-failed', cause: 'the disk is full' }));
      }
      saved.push(edited);
      return Promise.resolve(ok(undefined));
    },
    remove: (): Promise<Result<void, CaptureError>> => Promise.resolve(ok(undefined)),
    clearBook: (): Promise<Result<void, CaptureError>> => Promise.resolve(ok(undefined)),
  };

  const tags: TagRepository = {
    list: (): Promise<Result<readonly Tag[], TagError>> => Promise.resolve(ok([])),
    save: (): Promise<Result<void, TagError>> => Promise.resolve(ok(undefined)),
    remove: (tag: TagId): Promise<Result<void, TagError>> => {
      if (fault === 'removing') return Promise.resolve(err({ kind: 'storage-unavailable' }));
      removed.push(tag);
      return Promise.resolve(ok(undefined));
    },
  };

  return { captures, tags, saved, removed };
}

describe('deleteTag', () => {
  it('strips the tag from every capture carrying it and removes the record', async () => {
    const { captures, tags, saved, removed } = stores([
      capture('a', [SFX]),
      capture('b', [KEIGO]),
      capture('c', [SFX, KEIGO]),
    ]);

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual(ok(2));
    expect(saved.map((row) => row.id)).toEqual([captureId('a'), captureId('c')]);
    expect(at(saved, 0).tagIds).toEqual([]);
    expect(removed).toEqual([SFX]);
  });

  it('leaves the other tags a stripped capture carries alone', async () => {
    const { captures, tags, saved } = stores([capture('c', [SFX, KEIGO])]);

    await deleteTag({ captures, tags }, SFX);

    expect(at(saved, 0).tagIds).toEqual([KEIGO]);
  });

  it('writes nothing to a capture that never carried the tag', async () => {
    const { captures, tags, saved } = stores([capture('b', [KEIGO])]);

    await deleteTag({ captures, tags }, SFX);

    expect(saved).toEqual([]);
  });

  it('reports no capture lost the tag and still removes the record', async () => {
    const { captures, tags, removed } = stores([capture('b', [KEIGO])]);

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual(ok(0));
    expect(removed).toEqual([SFX]);
  });

  it('keeps the tag record when a capture cannot be stripped', async () => {
    const { captures, tags, removed } = stores([capture('a', [SFX])], 'saving');

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual(err({ kind: 'storage-failed', cause: 'the disk is full' }));
    expect(removed).toEqual([]);
  });

  it('reports a failure to read the captures rather than throwing', async () => {
    const { captures, tags, removed } = stores([capture('a', [SFX])], 'listing');

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual(err({ kind: 'storage-unavailable' }));
    expect(removed).toEqual([]);
  });

  it('reports a failure to remove the tag record rather than throwing', async () => {
    const { captures, tags, saved } = stores([capture('a', [SFX])], 'removing');

    const count = await deleteTag({ captures, tags }, SFX);

    expect(count).toEqual(err({ kind: 'storage-unavailable' }));
    expect(saved.map((row) => row.id)).toEqual([captureId('a')]);
  });
});
