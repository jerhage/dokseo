import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { readFailed, readReady } from '$lib/shared/read-state';
import type { Capture } from '../../domain/capture/capture';
import type { Tag } from '../../domain/tag/tag';
import { foundCaptures, foundTags, tagCountingOf } from './capture-find';
import type { CaptureFindRead } from './capture-find';

const CAPTURE: Capture = {
  id: captureId('a'),
  bookId: bookId('one'),
  anchor: regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 10, 10) }]),
  text: '海',
  origin: 'written',
  createdAt: 1,
  editedAt: null,
  tagIds: [],
};

const TAG: Tag = { id: tagId('sea'), name: 'sea', colour: 'sky', createdAt: 0 };

function readOf(tagCounts: ReadonlyMap<TagId, number>, reloads: string[]): CaptureFindRead {
  return {
    state: readReady([CAPTURE]),
    captures: [CAPTURE],
    tags: [TAG],
    tagCounts,
    reload: () => reloads.push('reload'),
  };
}

describe('foundCaptures', () => {
  it('answers the captures of a ready read only', () => {
    expect(foundCaptures({ kind: 'loading' })).toEqual([]);
    expect(foundCaptures(readFailed('x'))).toEqual([]);
    expect(foundCaptures(readReady([CAPTURE]))).toEqual([CAPTURE]);
  });
});

describe('foundTags', () => {
  it('answers the tags of a ready read, and none while loading or after a failure', () => {
    expect(foundTags({ kind: 'loading' })).toEqual([]);
    expect(foundTags(readFailed('x'))).toEqual([]);
    expect(foundTags(readReady([TAG]))).toEqual([TAG]);
  });
});

describe('tagCountingOf', () => {
  it('reads the counts of the find it is handed at each call', () => {
    const counts = new Map([[TAG.id, 3]]);
    let held: CaptureFindRead | null = null;
    const counting = tagCountingOf(() => held);

    expect(counting.counts().size).toBe(0);
    expect(() => counting.ask()).not.toThrow();
    held = readOf(counts, []);
    expect(counting.counts().get(TAG.id)).toBe(3);
  });

  it('asks the find to read again', () => {
    const reloads: string[] = [];
    const counting = tagCountingOf(() => readOf(new Map(), reloads));

    counting.ask();

    expect(reloads).toEqual(['reload']);
  });
});
