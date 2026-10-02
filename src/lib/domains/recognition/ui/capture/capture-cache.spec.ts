import { describe, expect, it, vi } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import type { Capture } from '../../domain/capture/capture';
import { namedTag } from '../../domain/tag/tag';
import { recognitionKeys } from '../../queries/recognition-keys';
import {
  CaptureCache,
  emptied,
  heldRows,
  withCapture,
  withCaptures,
  withNamed,
  withTag,
  withoutCapture,
} from './capture-cache';

const ONE = bookId('book-one');

const TWO = bookId('book-two');

const ANCHOR = regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 40, 20) }]);

const CROWN_TAG = namedTag(tagId('tag-crown'), 'crown', 'slate', 1);

const SWORD_TAG = namedTag(tagId('tag-sword'), 'sword', 'slate', 2);

function row(id: string, text = id, book = ONE): Capture {
  return {
    id: captureId(id),
    bookId: book,
    anchor: ANCHOR,
    text,
    origin: 'written',
    createdAt: 1,
    editedAt: null,
    tagIds: [],
  };
}

const UNAVAILABLE = { kind: 'storage-unavailable' } as const;

function read(...rows: Capture[]) {
  return { kind: 'success', captures: rows, unreadable: [] } as const;
}

describe('withCapture', () => {
  it('appends a capture the list does not hold', () => {
    expect(withCapture(read(row('a')), row('b'))).toEqual(read(row('a'), row('b')));
  });

  it('replaces a capture the list holds in place', () => {
    expect(withCapture(read(row('a'), row('b')), row('a', 'edited'))).toEqual(
      read(row('a', 'edited'), row('b')),
    );
  });

  it('leaves a list not read yet, or a blocked store, as it was', () => {
    expect(withCapture(undefined, row('a'))).toBeUndefined();
    expect(withCapture(UNAVAILABLE, row('a'))).toBe(UNAVAILABLE);
  });
});

describe('withoutCapture', () => {
  it('takes one capture out of the list', () => {
    expect(withoutCapture(read(row('a'), row('b')), captureId('a'))).toEqual(read(row('b')));
  });

  it('leaves a list not read yet as it was', () => {
    expect(withoutCapture(undefined, captureId('a'))).toBeUndefined();
  });
});

describe('withCaptures', () => {
  it('puts restored captures ahead of the captures made since, once each', () => {
    expect(withCaptures(read(row('b'), row('later')), [row('a'), row('b')])).toEqual(
      read(row('a'), row('b'), row('later')),
    );
  });

  it('leaves a blocked store as it was', () => {
    expect(withCaptures(UNAVAILABLE, [row('a')])).toBe(UNAVAILABLE);
  });
});

describe('emptied and heldRows', () => {
  it('empties a read list and answers the rows it held', () => {
    expect(emptied(read(row('a')))).toEqual(read());
    expect(heldRows(read(row('a')))).toEqual([row('a')]);
  });

  it('holds no rows for a list not read', () => {
    expect(emptied(undefined)).toBeUndefined();
    expect(heldRows(undefined)).toEqual([]);
    expect(heldRows(UNAVAILABLE)).toEqual([]);
  });
});

describe('withTag', () => {
  it('adds a tag it does not hold at the end', () => {
    expect(withTag([CROWN_TAG], SWORD_TAG)).toEqual([CROWN_TAG, SWORD_TAG]);
  });

  it('holds a tag it already holds once', () => {
    const held = [CROWN_TAG];

    expect(withTag(held, CROWN_TAG)).toBe(held);
  });

  it('names a tag in a read catalogue only', () => {
    expect(withNamed({ kind: 'success', tags: [CROWN_TAG] }, SWORD_TAG)).toEqual({
      kind: 'success',
      tags: [CROWN_TAG, SWORD_TAG],
    });
    expect(withNamed(undefined, SWORD_TAG)).toBeUndefined();
  });
});

describe('CaptureCache', () => {
  it('puts and drops a capture in the list of its own book', () => {
    const client = createTestQueryClient();
    client.setQueryData(recognitionKeys.captures(ONE), read(row('a')));
    client.setQueryData(recognitionKeys.captures(TWO), read());
    const cache = new CaptureCache(client);

    cache.put(row('b'));
    cache.drop(row('a'));

    expect(client.getQueryData(recognitionKeys.captures(ONE))).toEqual(read(row('b')));
    expect(client.getQueryData(recognitionKeys.captures(TWO))).toEqual(read());
    expect(cache.holds(row('b'))).toBe(true);
    expect(cache.holds(row('a'))).toBe(false);
  });

  it('holds nothing for a book whose list was never read', () => {
    const cache = new CaptureCache(createTestQueryClient());

    cache.put(row('a'));

    expect(cache.holds(row('a'))).toBe(false);
  });

  it('empties a book and puts its rows back ahead of the rows made since', () => {
    const client = createTestQueryClient();
    client.setQueryData(recognitionKeys.captures(ONE), read(row('a')));
    const cache = new CaptureCache(client);

    const held = cache.empty(ONE);
    cache.put(row('later'));
    cache.restore(ONE, held);

    expect(held).toEqual([row('a')]);
    expect(client.getQueryData(recognitionKeys.captures(ONE))).toEqual(
      read(row('a'), row('later')),
    );
  });

  it('names a new tag in the cached catalogue', () => {
    const client = createTestQueryClient();
    client.setQueryData(recognitionKeys.tags(), { kind: 'success', tags: [CROWN_TAG] });

    new CaptureCache(client).name(SWORD_TAG);

    expect(client.getQueryData(recognitionKeys.tags())).toEqual({
      kind: 'success',
      tags: [CROWN_TAG, SWORD_TAG],
    });
  });

  it('refreshes the book list and every capture after a write', async () => {
    const client = createTestQueryClient();
    const refreshed = vi.spyOn(client, 'invalidateQueries');

    await new CaptureCache(client).refresh(ONE);

    expect(refreshed.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      recognitionKeys.captures(ONE),
      recognitionKeys.everyCapture(),
    ]);
  });
});
