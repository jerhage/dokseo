import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangeMarker } from '$lib/shared/change-marker';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { captureFromStored } from '../../domain/capture/capture';
import type { StoredCapture } from '../../domain/capture/capture';
import { createCaptureRepository } from './indexeddb-captures.repo';

type HeldRow = { id?: unknown; bookId?: unknown; tagIds?: unknown };

type HeldWrite =
  | { readonly kind: 'put'; readonly store: string; readonly record: HeldRow }
  | { readonly kind: 'delete'; readonly store: string; readonly key: unknown }
  | { readonly kind: 'mark'; readonly marker: ChangeMarker };

const held = vi.hoisted(() => ({
  rows: new Map<unknown, HeldRow>(),
  rewrites: [] as string[],
  outbox: new Map<string, ChangeMarker>(),
}));

function mark(marker: ChangeMarker | null): void {
  if (marker !== null) held.outbox.set(`${marker.kind}:${marker.recordId}`, marker);
}

function indexed(row: HeldRow, index: string, key: unknown): boolean {
  if (index === 'tagIds') return Array.isArray(row.tagIds) && row.tagIds.includes(key);
  return row.bookId === key;
}

vi.mock('$lib/platform/idb/connection', () => ({
  openDatabase: () => Promise.resolve({}),
  listRecords: () => Promise.resolve([...held.rows.values()]),
  listByIndex: (_db: unknown, _store: string, _index: string, key: unknown) =>
    Promise.resolve([...held.rows.values()].filter((row) => row.bookId === key)),
  writeRecords: (_db: unknown, writes: readonly HeldWrite[]) => {
    for (const write of writes) {
      if (write.kind === 'mark') mark(write.marker);
      else if (write.kind === 'put') held.rows.set(write.record.id, write.record);
      else held.rows.delete(write.key);
    }
    return Promise.resolve();
  },
  deleteByIndex: (
    _db: unknown,
    _store: string,
    _index: string,
    key: unknown,
    markerFor?: (primary: unknown) => ChangeMarker | null,
  ) => {
    for (const row of [...held.rows.values()].filter((stored) => stored.bookId === key)) {
      held.rows.delete(row.id);
      if (markerFor !== undefined) mark(markerFor(row.id));
    }
    return Promise.resolve();
  },
  rewriteByIndex: (
    _db: unknown,
    _store: string,
    index: string,
    key: unknown,
    rewrite: (row: HeldRow) => HeldRow,
    markerFor?: (before: HeldRow, after: HeldRow) => ChangeMarker | null,
  ) => {
    held.rewrites.push(index);
    for (const row of [...held.rows.values()].filter((stored) => indexed(stored, index, key))) {
      const after = rewrite(row);
      held.rows.set(row.id, after);
      if (markerFor !== undefined) mark(markerFor(row, after));
    }
    return Promise.resolve();
  },
}));

const BOOK = bookId('book-one');

const REGIONS = [{ index: imageIndex(2), rect: pageRect(0.01, 0.02, 0.1, 0.04) }];

const GOOD: StoredCapture = {
  id: captureId('good'),
  bookId: BOOK,
  anchor: regionAnchor(REGIONS),
  text: 'こっちに来て',
  note: null,
  confidence: 0.9,
  createdAt: 1,
  editedAt: null,
  origin: 'recognized',
  tagIds: [],
};

const OLD_SHAPE = {
  id: 'old',
  bookId: BOOK,
  regions: REGIONS,
  text: 'そして',
  createdAt: 2,
};

beforeEach(() => {
  held.rows.clear();
  held.rewrites.length = 0;
  held.outbox.clear();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function markers(): readonly ChangeMarker[] {
  return [...held.outbox.values()];
}

describe('createCaptureRepository', () => {
  it.each([
    ['every capture', () => createCaptureRepository().listEverything()],
    ["a book's captures", () => createCaptureRepository().listForBook(BOOK)],
  ])(
    'lists the rows that read in %s and reports an old row without an anchor as unreadable',
    async (_, list) => {
      held.rows.set(GOOD.id, GOOD);
      held.rows.set(OLD_SHAPE.id, OLD_SHAPE);

      const listed = await list();

      expect(listed.kind === 'success' && listed.captures.map((row) => row.id)).toEqual(['good']);
      expect(listed.kind === 'success' && listed.unreadable).toEqual([
        { id: 'old', stored: OLD_SHAPE },
      ]);
    },
  );

  it('moves every row of a book onto another book, writing a readable row as its mapped capture', async () => {
    const other = { ...GOOD, id: captureId('other'), bookId: bookId('book-two') };
    const retired = { ...GOOD, retired: 'dropped' };
    held.rows.set(GOOD.id, retired);
    held.rows.set(OLD_SHAPE.id, OLD_SHAPE);
    held.rows.set(other.id, other);

    const moved = await createCaptureRepository().moveBook(BOOK, bookId('book-two'));

    expect(moved).toEqual({ kind: 'success' });
    expect(held.rows.get('good')).toEqual({ ...GOOD, bookId: 'book-two' });
    expect(held.rows.get('old')).toEqual({ ...OLD_SHAPE, bookId: 'book-two' });
    expect(held.rows.get('other')).toEqual(other);
  });

  it('removes an unreadable row by its id without reading it', async () => {
    held.rows.set(OLD_SHAPE.id, OLD_SHAPE);
    const repository = createCaptureRepository();

    const removed = await repository.remove(captureId('old'));

    expect(removed).toEqual({ kind: 'success' });
    expect(await repository.listEverything()).toEqual({
      kind: 'success',
      captures: [],
      unreadable: [],
    });
  });

  it('untags every readable capture carrying a tag through the tag index and counts them', async () => {
    const sfx = tagId('sfx');
    const keigo = tagId('keigo');
    const tagged = { ...GOOD, tagIds: [sfx, keigo] };
    const other = { ...GOOD, id: captureId('other'), tagIds: [keigo] };
    const broken = { ...OLD_SHAPE, tagIds: [sfx] };
    held.rows.set(tagged.id, tagged);
    held.rows.set(other.id, other);
    held.rows.set(broken.id, broken);

    const untagged = await createCaptureRepository().untagEverywhere(sfx);

    expect(untagged).toEqual({ kind: 'success', untagged: 1 });
    expect(held.rewrites).toEqual(['tagIds']);
    expect(held.rows.get('good')).toEqual({ ...GOOD, tagIds: [keigo] });
    expect(held.rows.get('other')).toEqual(other);
    expect(held.rows.get('old')).toEqual(broken);
  });

  it('marks a saved capture in the outbox under its id', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(5);

    await createCaptureRepository().save(captureFromStored(GOOD));

    expect(markers()).toEqual([{ kind: 'capture', recordId: 'good', deleted: false, at: 5 }]);
  });

  it('leaves a deleted marker when a capture is removed', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(6);

    await createCaptureRepository().remove(captureId('good'));

    expect(markers()).toEqual([{ kind: 'capture', recordId: 'good', deleted: true, at: 6 }]);
  });

  it('marks every capture of a cleared book as deleted', async () => {
    const other = { ...GOOD, id: captureId('other') };
    const elsewhere = { ...GOOD, id: captureId('elsewhere'), bookId: bookId('book-two') };
    held.rows.set(GOOD.id, GOOD);
    held.rows.set(other.id, other);
    held.rows.set(elsewhere.id, elsewhere);

    await createCaptureRepository().clearBook(BOOK);

    expect(markers().map((marker) => [marker.recordId, marker.deleted])).toEqual([
      ['good', true],
      ['other', true],
    ]);
  });

  it('marks only the captures an untag rewrote', async () => {
    const sfx = tagId('sfx');
    held.rows.set(GOOD.id, { ...GOOD, tagIds: [sfx] });
    held.rows.set('plain', { ...GOOD, id: captureId('plain'), tagIds: [] });

    await createCaptureRepository().untagEverywhere(sfx);

    expect(markers().map((marker) => marker.recordId)).toEqual(['good']);
  });

  it('writes no marker when the repository is built unmarked', async () => {
    held.rows.set(GOOD.id, GOOD);
    const repository = createCaptureRepository('unmarked');

    await repository.save(captureFromStored(GOOD));
    await repository.remove(captureId('good'));
    await repository.clearBook(BOOK);
    await repository.moveBook(BOOK, bookId('book-two'));

    expect(markers()).toEqual([]);
  });
});
