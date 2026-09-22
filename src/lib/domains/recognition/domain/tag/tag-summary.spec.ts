import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { at } from '$lib/shared/testing/at';
import { alsoTagged, tagSummary } from './tag-summary';
import type { TagMember } from './tag-summary';

const SFX: TagId = tagId('sfx');

const KEIGO: TagId = tagId('keigo');

const SLANG: TagId = tagId('slang');

const NAMES: TagId = tagId('a-names');

function member(book: string, tags: readonly TagId[], createdAt: number): TagMember {
  return {
    origin: 'written',
    bookId: bookId(book),
    anchor: regionAnchor([{ index: imageIndex(0), rect: imageRect(0, 0, 100, 60) }]),
    text: '海',
    tagIds: tags,
    createdAt,
  };
}

describe('tagSummary', () => {
  it('counts the captures carrying the tag and the documents they sit in', () => {
    const summary = tagSummary(
      [
        member('one', [SFX], 10),
        member('one', [SFX, KEIGO], 20),
        member('two', [SFX], 30),
        member('three', [KEIGO], 40),
      ],
      SFX,
    );

    expect(summary.captures).toBe(3);
    expect(summary.documents).toBe(2);
  });

  it('reports the newest createdAt among the captures carrying the tag', () => {
    const summary = tagSummary(
      [member('one', [SFX], 10), member('one', [SFX], 90), member('one', [KEIGO], 500)],
      SFX,
    );

    expect(summary.lastAdded).toBe(90);
  });

  it('reports zeroes and no last addition for a tag nothing carries', () => {
    expect(tagSummary([member('one', [KEIGO], 10)], SFX)).toEqual({
      captures: 0,
      documents: 0,
      lastAdded: null,
    });
  });

  it('reports zeroes and no last addition when there are no captures at all', () => {
    expect(tagSummary([], SFX)).toEqual({ captures: 0, documents: 0, lastAdded: null });
  });
});

describe('alsoTagged', () => {
  it('counts each other tag across the captures carrying the chosen one', () => {
    const also = alsoTagged(
      [
        member('one', [SFX, KEIGO], 10),
        member('one', [SFX, KEIGO, SLANG], 20),
        member('two', [KEIGO], 30),
      ],
      SFX,
    );

    expect(also).toEqual([
      { id: KEIGO, count: 2 },
      { id: SLANG, count: 1 },
    ]);
  });

  it('orders the co-occurrent tags by count descending', () => {
    const also = alsoTagged(
      [
        member('one', [SFX, SLANG], 10),
        member('one', [SFX, SLANG], 20),
        member('one', [SFX, SLANG, KEIGO], 30),
      ],
      SFX,
    );

    expect(also.map((one) => one.id)).toEqual([SLANG, KEIGO]);
  });

  it('breaks a tie on count by tag id, so the order never wanders', () => {
    const also = alsoTagged([member('one', [SFX, SLANG, NAMES, KEIGO], 10)], SFX);

    expect(also.map((one) => one.id)).toEqual([NAMES, KEIGO, SLANG]);
  });

  it('never includes the chosen tag itself', () => {
    const also = alsoTagged([member('one', [SFX, KEIGO], 10), member('two', [SFX], 20)], SFX);

    expect(also.map((one) => one.id)).not.toContain(SFX);
    expect(at(also, 0)).toEqual({ id: KEIGO, count: 1 });
  });

  it('reports nothing for a tag nothing carries', () => {
    expect(alsoTagged([member('one', [KEIGO, SLANG], 10)], SFX)).toEqual([]);
  });

  it('ignores a tag that only appears on a capture without the chosen one', () => {
    const also = alsoTagged([member('one', [SFX], 10), member('two', [KEIGO, SLANG], 20)], SFX);

    expect(also).toEqual([]);
  });
});
