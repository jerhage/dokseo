import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Capture } from '../capture/capture';
import { tagCounts, taggedCapture, untaggedCapture } from './capture-tags';

const BOOK = bookId('book-one');

const REGIONS: readonly ImageRegion[] = [{ index: imageIndex(3), rect: imageRect(0, 0, 10, 10) }];

const GRAMMAR = tagId('grammar');

const SFX = tagId('sfx');

const UNUSED = tagId('unused');

function capture(id: string, tags: readonly TagId[]): Capture {
  return {
    id: captureId(id),
    bookId: BOOK,
    regions: REGIONS,
    text: 'こっちに来て',
    confidence: null,
    origin: 'recognized',
    createdAt: 1,
    editedAt: null,
    tagIds: tags,
  };
}

describe('tagCounts', () => {
  it('counts how many captures carry each tag', () => {
    const counts = tagCounts([
      capture('a', [GRAMMAR, SFX]),
      capture('b', [GRAMMAR]),
      capture('c', []),
    ]);

    expect(counts.get(GRAMMAR)).toBe(2);
    expect(counts.get(SFX)).toBe(1);
  });

  it('reports nothing for a tag no capture carries', () => {
    const counts = tagCounts([capture('a', [GRAMMAR])]);

    expect(counts.get(UNUSED)).toBeUndefined();
  });

  it('counts nothing across no captures', () => {
    expect(tagCounts([]).size).toBe(0);
  });
});

describe('taggedCapture', () => {
  it('adds a tag the capture does not carry', () => {
    expect(taggedCapture(capture('a', [GRAMMAR]), SFX).tagIds).toEqual([GRAMMAR, SFX]);
  });

  it('adds the same tag twice no more than once', () => {
    const once = taggedCapture(capture('a', []), GRAMMAR);

    expect(taggedCapture(once, GRAMMAR).tagIds).toEqual([GRAMMAR]);
  });

  it('leaves the capture it was given untouched', () => {
    const before = capture('a', [GRAMMAR]);

    taggedCapture(before, SFX);

    expect(before.tagIds).toEqual([GRAMMAR]);
  });
});

describe('untaggedCapture', () => {
  it('removes the tag the capture carries', () => {
    expect(untaggedCapture(capture('a', [GRAMMAR, SFX]), GRAMMAR).tagIds).toEqual([SFX]);
  });

  it('keeps every other field of the capture', () => {
    const before = capture('a', [GRAMMAR]);

    expect(untaggedCapture(before, GRAMMAR)).toEqual({ ...before, tagIds: [] });
  });

  it('removes a tag the capture never carried without complaint', () => {
    expect(untaggedCapture(capture('a', [GRAMMAR]), UNUSED).tagIds).toEqual([GRAMMAR]);
  });

  it('leaves the capture it was given untouched', () => {
    const before = capture('a', [GRAMMAR, SFX]);

    untaggedCapture(before, GRAMMAR);

    expect(before.tagIds).toEqual([GRAMMAR, SFX]);
  });
});
