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
import type { BookId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { bookCapturesFileName, exportBookCaptures, titleSlug } from './export-book-captures';
import type { ExportBookCapturesDeps } from './export-book-captures';
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

const OTHER: Book = { ...SHELF, id: bookId('shelf-2'), title: 'Aria 1' };

const REMOVED: RemovedBook = {
  id: bookId('gone-1'),
  title: '風の谷',
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
  fileName: 'kaze.pdf',
  imageCount: 40,
  addedAt: 1,
  position: imagePlace(imageIndex(0)),
  lastReadAt: null,
  finishedAt: null,
  removedAt: 2,
};

const LEGACY_ROW: StoredRemovedBook = {
  id: 'old-1',
  title: '風の谷 2',
  alias: 'Valley',
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  sourceKind: 'archive',
  contentHash: 'a'.repeat(64),
  fileName: 'kaze-2.cbz',
  imageCount: 40,
  addedAt: 1,
  position: 45,
  removedAt: 2,
};

const SOUND_IDENTITY_ROW: StoredRemovedBook = {
  ...REMOVED,
  id: 'old-2',
  title: '風の谷 3',
  position: 45,
};

function unreadableRecords(rows: readonly StoredRemovedBook[]): readonly UnreadableRemovedBook[] {
  return unreadableRemovedBooksFrom(rows);
}

const KANJI: Tag = { id: tagId('tag-kanji'), name: 'kanji', colour: 'sage', createdAt: 10 };

const GRAMMAR: Tag = { id: tagId('tag-grammar'), name: 'grammar', colour: 'rose', createdAt: 11 };

function capture(id: string, book: string, tags: readonly Tag[] = [KANJI]): Capture {
  return {
    id: captureId(id),
    bookId: bookId(book),
    anchor: regionAnchor([{ index: imageIndex(4), rect: pageRect(0.01, 0.02, 0.03, 0.04) }]),
    text: id,
    origin: 'written',
    createdAt: 100,
    editedAt: null,
    tagIds: tags.map((tag) => tag.id),
  };
}

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

type Holdings = {
  readonly books?: readonly Book[];
  readonly removed?: readonly RemovedBook[];
  readonly unreadableRemoved?: readonly UnreadableRemovedBook[];
  readonly tags?: readonly Tag[];
  readonly captures?: readonly Capture[];
  readonly unavailable?: 'shelf' | 'removed' | 'tags' | 'captures';
};

function deps(holdings: Holdings = {}): ExportBookCapturesDeps {
  const repository: LibraryRepository = {
    list: () =>
      Promise.resolve(
        holdings.unavailable === 'shelf'
          ? STORAGE_UNAVAILABLE
          : { kind: 'success', books: holdings.books ?? [SHELF, OTHER], unreadable: [] },
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
    addRemoved: notUsed,
    replaceFile: notUsed,
    forgetRemoved: notUsed,
    erase: notUsed,
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
          : { kind: 'success', tags: holdings.tags ?? [KANJI, GRAMMAR], unreadable: [] },
      ),
    save: notUsed,
    remove: notUsed,
  };
  const held = holdings.captures ?? [
    capture('capture-1', 'shelf-1'),
    capture('capture-2', 'shelf-2', [GRAMMAR]),
    capture('capture-3', 'gone-1', [GRAMMAR]),
  ];
  const captures: CaptureRepository = {
    listForBook: (book: BookId) =>
      Promise.resolve(
        holdings.unavailable === 'captures'
          ? STORAGE_UNAVAILABLE
          : {
              kind: 'success',
              captures: held.filter((entry) => entry.bookId === book),
              unreadable: [],
            },
      ),
    listEverything: notUsed,
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

async function readBack(holdings: Holdings, id: BookId) {
  const exported = await exportBookCaptures(deps(holdings), id);
  if (exported.kind !== 'success') throw new Error(exported.kind);
  return readCapturesFile(exported.exported.file.text);
}

describe('exportBookCaptures', () => {
  it('writes only the captures of the chosen shelf book, with that book alone', async () => {
    const read = await readBack({}, SHELF.id);

    expect(read).toMatchObject({
      kind: 'read',
      books: [{ title: 'Yotsuba&! 1' }],
      captures: [{ capture: { id: 'capture-1' } }],
    });
  });

  it('writes the captures of a removed book with its record', async () => {
    const read = await readBack({}, REMOVED.id);

    expect(read).toMatchObject({
      kind: 'read',
      books: [{ title: '風の谷', layoutKind: 'paged' }],
      captures: [{ capture: { id: 'capture-3' } }],
    });
  });

  it('writes the captures of a removed record that does not read, under the fields its row holds', async () => {
    const exported = await exportBookCaptures(
      deps({
        unreadableRemoved: unreadableRecords([LEGACY_ROW]),
        captures: [capture('capture-4', 'old-1')],
      }),
      bookId('old-1'),
    );
    if (exported.kind !== 'success') throw new Error(exported.kind);
    const written: unknown = JSON.parse(exported.exported.file.text);

    expect(exported.exported).toMatchObject({
      captures: 1,
      file: { name: 'dokseo-captures-valley-2026-10-03.json' },
    });
    expect(written).toMatchObject({
      books: [
        {
          key: 'book-1',
          contentHash: 'a'.repeat(64),
          fileName: 'kaze-2.cbz',
          title: '風の谷 2',
          alias: 'Valley',
          language: 'ja',
          direction: 'rtl',
          layoutKind: 'paged',
          sourceKind: 'archive',
          imageCount: 40,
        },
      ],
      captures: [{ id: 'capture-4', bookKey: 'book-1' }],
    });
  });

  it('writes a removed record that does not read but keeps a whole identity as a book the file reads back', async () => {
    const read = await readBack(
      {
        unreadableRemoved: unreadableRecords([SOUND_IDENTITY_ROW]),
        captures: [capture('capture-5', 'old-2')],
      },
      bookId('old-2'),
    );

    expect(read).toMatchObject({
      kind: 'read',
      books: [{ title: '風の谷 3', sourceKind: 'pdf', imageCount: 40 }],
      captures: [{ capture: { id: 'capture-5' } }],
      unreadable: [],
    });
  });

  it('writes only the tags its captures carry', async () => {
    const read = await readBack({}, SHELF.id);

    expect(read).toMatchObject({ kind: 'read', tags: [{ name: 'kanji' }] });
    if (read.kind === 'read') expect(read.tags).toHaveLength(1);
  });

  it('counts the captures and names a json file after the book and the local date', async () => {
    const exported = await exportBookCaptures(deps(), SHELF.id);

    expect(exported).toMatchObject({
      kind: 'success',
      exported: {
        captures: 1,
        file: { name: 'dokseo-captures-yotsuba-1-2026-10-03.json', type: 'application/json' },
      },
    });
  });

  it('names the file after the alias when the book has one', async () => {
    const exported = await exportBookCaptures(
      deps({ books: [{ ...SHELF, alias: 'Yotsuba, volume one' }] }),
      SHELF.id,
    );

    expect(exported).toMatchObject({
      exported: { file: { name: 'dokseo-captures-yotsuba-volume-one-2026-10-03.json' } },
    });
  });

  it('reports nothing to export for a book without captures', async () => {
    const exported = await exportBookCaptures(deps({ captures: [] }), SHELF.id);

    expect(exported).toEqual({ kind: 'nothing-to-export' });
  });

  it('reports nothing to export for a book on neither the shelf nor the removed list', async () => {
    const exported = await exportBookCaptures(deps({ books: [], removed: [] }), SHELF.id);

    expect(exported).toEqual({ kind: 'nothing-to-export' });
  });

  it.each(['shelf', 'removed', 'tags', 'captures'] as const)(
    'passes on storage-unavailable from the %s read',
    async (unavailable) => {
      const exported = await exportBookCaptures(deps({ unavailable }), SHELF.id);

      expect(exported).toEqual(STORAGE_UNAVAILABLE);
    },
  );
});

describe('titleSlug', () => {
  it.each([
    ['Yotsuba&! 1', 'yotsuba-1'],
    ['  Aria: The Masterpiece  ', 'aria-the-masterpiece'],
    ['風の谷のナウシカ 1', '風の谷のナウシカ-1'],
    ['../etc/passwd', 'etc-passwd'],
    ['a/b\\c:d*e?f"g<h>i|j', 'a-b-c-d-e-f-g-h-i-j'],
    ['！？', ''],
  ])('turns %j into %j', (title, slug) => {
    expect(titleSlug(title)).toBe(slug);
  });

  it('cuts a long title to sixty characters with no trailing dash', () => {
    const slug = titleSlug(`${'a'.repeat(59)} tail`);

    expect(slug).toBe('a'.repeat(59));
  });
});

describe('bookCapturesFileName', () => {
  it('falls back to the plain name when the title leaves no slug', () => {
    expect(bookCapturesFileName('!!!', EXPORTED_AT)).toBe('dokseo-captures-2026-10-03.json');
  });
});
