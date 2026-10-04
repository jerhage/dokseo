import { describe, expect, it } from 'vitest';
import type { Book } from '$lib/domains/library/domain/book/book';
import type { LibraryRepository } from '$lib/domains/library/domain/book/library-repository';
import { unreadableRemovedBooksFrom } from '$lib/domains/library/domain/book/removed-book';
import type {
  RemovedBook,
  StoredRemovedBook,
  UnreadableRemovedBook,
} from '$lib/domains/library/domain/book/removed-book';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { CaptureRepository } from '$lib/domains/recognition/domain/capture/capture-repository';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import type { TagRepository } from '$lib/domains/recognition/domain/tag/tag-repository';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, contentHash, imageIndex, tagId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { capturesFileName, exportCaptures } from './export-captures';
import type { ExportCapturesDeps } from './export-captures';
import { readCapturesFile } from './read-captures-file';

const EXPORTED_AT = new Date(2026, 9, 3, 23, 30).getTime();

const SHELF: Book = {
  id: bookId('shelf-1'),
  title: 'Yotsuba&! 1',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'auto',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: contentHash('0123456789abcdef0123456789abcdef'),
  fileName: 'yotsuba-1.cbz',
  imageCount: 182,
  addedAt: 1,
  position: imagePlace(imageIndex(3)),
  lastReadAt: 2,
  finishedAt: null,
};

const REMOVED: RemovedBook = {
  id: bookId('gone-1'),
  title: 'Aria 3',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'auto',
  pageFit: 'height',
  sourceKind: 'pdf',
  contentHash: contentHash('fedcba9876543210fedcba9876543210'),
  fileName: 'aria-3.pdf',
  imageCount: 40,
  addedAt: 1,
  position: imagePlace(imageIndex(0)),
  lastReadAt: null,
  finishedAt: null,
  removedAt: 2,
};

const KANJI: Tag = {
  id: tagId('tag-kanji'),
  name: 'kanji',
  colour: 'sage',
  createdAt: 10,
};

function capture(id: string, book: string): Capture {
  return {
    id: captureId(id),
    bookId: bookId(book),
    anchor: regionAnchor([{ index: imageIndex(4), rect: pageRect(0.01, 0.02, 0.03, 0.04) }]),
    text: id,
    origin: 'written',
    createdAt: 100,
    editedAt: null,
    tagIds: [KANJI.id],
  };
}

const SOUND_IDENTITY_ROW: StoredRemovedBook = {
  ...REMOVED,
  id: 'old-2',
  title: 'Aria 4',
  position: 45,
};

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

type Holdings = {
  readonly books?: readonly Book[];
  readonly removed?: readonly RemovedBook[];
  readonly tags?: readonly Tag[];
  readonly captures?: readonly Capture[];
  readonly unreadableBooks?: number;
  readonly unreadableRemoved?: readonly UnreadableRemovedBook[];
  readonly unreadableTags?: number;
  readonly unreadableCaptures?: number;
  readonly unavailable?: 'shelf' | 'removed' | 'tags' | 'captures';
};

function ids(count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => `unreadable-${index}`);
}

function deps(holdings: Holdings = {}): ExportCapturesDeps {
  const repository: LibraryRepository = {
    list: () =>
      Promise.resolve(
        holdings.unavailable === 'shelf'
          ? STORAGE_UNAVAILABLE
          : {
              kind: 'success',
              books: holdings.books ?? [SHELF],
              unreadable: ids(holdings.unreadableBooks ?? 0).map((id) => ({
                id: bookId(id),
                title: null,
                alias: null,
                contentHash: '',
                fileName: '',
                stored: { id },
              })),
            },
      ),
    get: notUsed,
    add: notUsed,
    readPageList: notUsed,
    savePageList: notUsed,
    remove: notUsed,
    listRemoved: () =>
      Promise.resolve(
        holdings.unavailable === 'removed'
          ? STORAGE_UNAVAILABLE
          : {
              kind: 'success',
              removed: holdings.removed ?? [REMOVED],
              unreadable: holdings.unreadableRemoved ?? [],
            },
      ),
    listRestorable: notUsed,
    addRemoved: () => Promise.reject(new Error('not used')),
    forgetRemoved: notUsed,
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    storedBytes: notUsed,
  };
  const tags: TagRepository = {
    list: () =>
      Promise.resolve(
        holdings.unavailable === 'tags'
          ? STORAGE_UNAVAILABLE
          : {
              kind: 'success',
              tags: holdings.tags ?? [KANJI],
              unreadable: ids(holdings.unreadableTags ?? 0).map((id) => ({
                id: tagId(id),
                name: null,
                stored: { id },
              })),
            },
      ),
    save: notUsed,
    remove: notUsed,
  };
  const captures: CaptureRepository = {
    listForBook: notUsed,
    listEverything: () =>
      Promise.resolve(
        holdings.unavailable === 'captures'
          ? STORAGE_UNAVAILABLE
          : {
              kind: 'success',
              captures: holdings.captures ?? [capture('capture-1', 'shelf-1')],
              unreadable: ids(holdings.unreadableCaptures ?? 0).map((id) => ({
                id: captureId(id),
                stored: { id, bookId: 'shelf-1', confidence: Number.NaN },
              })),
            },
      ),
    save: notUsed,
    remove: notUsed,
    clearBook: notUsed,
    moveBook: notUsed,
    untagEverywhere: notUsed,
  };
  return {
    shelf: { repository },
    removed: { repository },
    tags: { tags },
    captures: { captures },
    now: () => EXPORTED_AT,
    appVersion: '0.9.3',
  };
}

describe('exportCaptures', () => {
  it('writes every capture whose book is on the shelf or removed, with the books they belong to', async () => {
    const exported = await exportCaptures(
      deps({
        captures: [
          capture('capture-1', 'shelf-1'),
          capture('capture-2', 'shelf-1'),
          capture('capture-3', 'gone-1'),
        ],
      }),
    );

    expect(exported).toMatchObject({
      kind: 'success',
      exported: { captures: 3, books: 2, bookless: 0 },
    });
  });

  it('builds a file that reads back with its app version, time, books, tags and captures', async () => {
    const exported = await exportCaptures(deps());
    if (exported.kind !== 'success') throw new Error(exported.kind);

    const read = readCapturesFile(exported.exported.json);

    expect(read).toMatchObject({
      kind: 'read',
      exportedAt: EXPORTED_AT,
      appVersion: '0.9.3',
      books: [{ title: 'Yotsuba&! 1' }],
      tags: [KANJI],
      captures: [
        {
          book: { title: 'Yotsuba&! 1' },
          capture: { id: 'capture-1', tagIds: [KANJI.id] },
        },
      ],
      unreadable: [],
    });
  });

  it('names the file by the local date it was exported on', async () => {
    const exported = await exportCaptures(deps());

    expect(exported).toMatchObject({
      exported: { fileName: 'dokseo-captures-2026-10-03.json' },
    });
  });

  it('counts the captures that belong to no known book and leaves them out', async () => {
    const exported = await exportCaptures(
      deps({
        captures: [capture('capture-1', 'shelf-1'), capture('stray', 'nowhere')],
      }),
    );

    expect(exported).toMatchObject({
      kind: 'success',
      exported: { captures: 1, bookless: 1 },
    });
  });

  it('carries the counts of stored rows that could not be read', async () => {
    const exported = await exportCaptures(
      deps({ unreadableBooks: 1, unreadableTags: 2, unreadableCaptures: 3 }),
    );

    expect(exported).toMatchObject({
      exported: { unreadable: { books: 1, tags: 2, captures: 3 } },
    });
  });

  it('keeps the stored rows of unreadable tags and captures in the file, and counts them', async () => {
    const exported = await exportCaptures(deps({ unreadableTags: 1, unreadableCaptures: 2 }));
    if (exported.kind !== 'success') throw new Error(exported.kind);

    expect(exported.exported.storedUnreadable).toBe(3);
    expect(JSON.parse(exported.exported.json).unreadable).toEqual({
      books: [],
      tags: [{ id: 'unreadable-0' }],
      captures: [
        { id: 'unreadable-0', bookId: 'shelf-1', confidence: null },
        { id: 'unreadable-1', bookId: 'shelf-1', confidence: null },
      ],
    });
  });

  it('keeps the stored row of an unreadable shelf book a capture names', async () => {
    const exported = await exportCaptures(
      deps({
        unreadableBooks: 1,
        captures: [capture('capture-1', 'shelf-1'), capture('capture-2', 'unreadable-0')],
      }),
    );
    if (exported.kind !== 'success') throw new Error(exported.kind);

    expect(JSON.parse(exported.exported.json).unreadable.books).toEqual([{ id: 'unreadable-0' }]);
    expect(exported.exported.storedUnreadable).toBe(1);
  });

  it('writes the captures of an unreadable removed record under the identity its row stores, and keeps the row', async () => {
    const exported = await exportCaptures(
      deps({
        unreadableRemoved: unreadableRemovedBooksFrom([SOUND_IDENTITY_ROW]),
        captures: [capture('capture-1', 'shelf-1'), capture('capture-2', 'old-2')],
      }),
    );
    if (exported.kind !== 'success') throw new Error(exported.kind);

    const read = readCapturesFile(exported.exported.json);
    expect(exported.exported).toMatchObject({ captures: 2, books: 2, bookless: 0 });
    expect(read.kind === 'read' && read.captures.map(({ book }) => book.title)).toEqual([
      'Yotsuba&! 1',
      'Aria 4',
    ]);
    expect(JSON.parse(exported.exported.json).unreadable.books).toEqual([SOUND_IDENTITY_ROW]);
  });

  it('writes no unreadable section when every stored row reads', async () => {
    const exported = await exportCaptures(deps());
    if (exported.kind !== 'success') throw new Error(exported.kind);

    expect(exported.exported.storedUnreadable).toBe(0);
    expect(JSON.parse(exported.exported.json)).not.toHaveProperty('unreadable');
  });

  it('reports nothing to export when no capture is held', async () => {
    const exported = await exportCaptures(deps({ captures: [], unreadableCaptures: 2 }));

    expect(exported).toEqual({
      kind: 'nothing-to-export',
      bookless: 0,
      unreadable: { books: 0, tags: 0, captures: 2 },
    });
  });

  it('reports nothing to export when every capture belongs to no known book', async () => {
    const exported = await exportCaptures(deps({ captures: [capture('stray', 'nowhere')] }));

    expect(exported).toMatchObject({ kind: 'nothing-to-export', bookless: 1 });
  });

  it.each(['shelf', 'removed', 'tags', 'captures'] as const)(
    'passes on storage-unavailable from the %s listing',
    async (unavailable) => {
      expect(await exportCaptures(deps({ unavailable }))).toEqual(STORAGE_UNAVAILABLE);
    },
  );
});

describe('capturesFileName', () => {
  it('pads the month and the day to two digits', () => {
    expect(capturesFileName(new Date(2026, 0, 5, 9).getTime())).toBe(
      'dokseo-captures-2026-01-05.json',
    );
  });
});
