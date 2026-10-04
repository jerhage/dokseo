import { describe, expect, it } from 'vitest';
import type { Book } from '$lib/domains/library/domain/book/book';
import type { RestoreCandidate } from '$lib/domains/library/domain/book/removed-book';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, contentHash, imageIndex, seriesId, tagId } from '$lib/shared/ids';
import { imagePlace, START_OF_THE_TEXT } from '$lib/shared/reading-place';
import type { BooklessCapture, FileBook } from './captures-file';
import { planCapturesImport } from './captures-import-plan';
import type { LocalHoldings, PlanMinting, ReadCapturesFile } from './captures-import-plan';

const HASH = '0123456789abcdef0123456789abcdef';

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
  contentHash: contentHash(HASH),
  fileName: 'yotsuba-1.cbz',
  imageCount: 182,
  addedAt: 1,
  position: imagePlace(imageIndex(3)),
  lastReadAt: 2,
  finishedAt: null,
};

const OTHER_HASH = 'fedcba9876543210fedcba9876543210';

const REMOVED: RestoreCandidate = {
  id: bookId('gone-1'),
  title: 'Aria 3',
  alias: null,
  seriesId: null,
  volume: null,
  contentHash: OTHER_HASH,
  fileName: 'aria-3.pdf',
  addedAt: 4,
};

const FILE_BOOK: FileBook = {
  key: 'book-1',
  contentHash: contentHash(HASH),
  fileName: 'yotsuba-1.cbz',
  title: 'Yotsuba&! 1',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  direction: 'rtl',
  layoutKind: 'paged',
  sourceKind: 'archive',
  imageCount: 182,
};

const ELSEWHERE: FileBook = {
  ...FILE_BOOK,
  key: 'book-2',
  contentHash: contentHash('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
  fileName: 'kiki.epub',
  title: 'Kiki',
  alias: 'Witch',
  language: 'ja',
  direction: 'ltr',
  layoutKind: 'flow',
  sourceKind: 'epub',
  imageCount: 0,
};

const KANJI: Tag = { id: tagId('tag-kanji'), name: 'Kanji', colour: 'sage', createdAt: 10 };

const SFX: Tag = { id: tagId('tag-sfx'), name: 'sfx', colour: 'clay', createdAt: 11 };

function bookless(id: string, fields: Partial<BooklessCapture> = {}): BooklessCapture {
  return {
    id: captureId(id),
    anchor: regionAnchor([{ index: imageIndex(4), rect: pageRect(0.01, 0.02, 0.03, 0.04) }]),
    text: `text of ${id}`,
    origin: 'recognized',
    confidence: null,
    note: null,
    createdAt: 100,
    editedAt: null,
    tagIds: [],
    ...fields,
  } as BooklessCapture;
}

function local(id: string, book: string, fields: Partial<BooklessCapture> = {}): Capture {
  return { ...bookless(id, fields), bookId: bookId(book) } as Capture;
}

function read(
  captures: readonly { readonly book: FileBook; readonly capture: BooklessCapture }[],
  more: Partial<ReadCapturesFile> = {},
): ReadCapturesFile {
  const books = [...new Set(captures.map((entry) => entry.book))];
  return {
    kind: 'read',
    exportedAt: 1,
    appVersion: '0.9.3',
    books,
    tags: [],
    captures,
    unreadable: [],
    droppedTags: [],
    storedUnreadable: 0,
    ...more,
  };
}

function holdings(more: Partial<LocalHoldings> = {}): LocalHoldings {
  return {
    shelf: [SHELF],
    restorable: { removed: [], unreadable: [] },
    tags: [],
    unreadableTagIds: [],
    captures: [],
    ...more,
  };
}

function minting(): PlanMinting {
  let next = 0;
  return {
    newId: () => {
      next += 1;
      return `minted-${next}`;
    },
    now: () => 500,
  };
}

describe('planCapturesImport', () => {
  it('matches a file book to the shelf book with the same content hash', () => {
    const plan = planCapturesImport(
      read([
        { book: { ...FILE_BOOK, fileName: 'other.cbz', title: 'Other' }, capture: bookless('c1') },
      ]),
      holdings(),
      minting(),
    );

    expect(plan.books[0]?.match).toEqual({ kind: 'shelf', book: SHELF });
    expect(plan.captures).toEqual([
      { kind: 'new', capture: local('c1', 'shelf-1'), onShelf: true },
    ]);
  });

  it('matches a file book to the shelf book by file name when the hash differs', () => {
    const plan = planCapturesImport(
      read([
        {
          book: { ...FILE_BOOK, contentHash: contentHash(OTHER_HASH), title: 'Other' },
          capture: bookless('c1'),
        },
      ]),
      holdings(),
      minting(),
    );

    expect(plan.books[0]?.match).toEqual({ kind: 'shelf', book: SHELF });
  });

  it('matches a file book to the shelf book by title when hash and file name differ', () => {
    const plan = planCapturesImport(
      read([
        {
          book: { ...FILE_BOOK, contentHash: contentHash(OTHER_HASH), fileName: 'x.cbz' },
          capture: bookless('c1'),
        },
      ]),
      holdings(),
      minting(),
    );

    expect(plan.books[0]?.match).toEqual({ kind: 'shelf', book: SHELF });
  });

  it('matches a book not on the shelf to a removed record and holds its captures there', () => {
    const plan = planCapturesImport(
      read([
        {
          book: { ...ELSEWHERE, contentHash: contentHash(OTHER_HASH), fileName: 'aria-3.pdf' },
          capture: bookless('c1'),
        },
      ]),
      holdings({ restorable: { removed: [REMOVED], unreadable: [] } }),
      minting(),
    );

    expect(plan.books[0]?.match).toEqual({ kind: 'restorable', book: REMOVED });
    expect(plan.records).toEqual([]);
    expect(plan.captures).toEqual([
      { kind: 'new', capture: local('c1', 'gone-1'), onShelf: false },
    ]);
    expect(plan.summary.notOnThisDevice).toEqual({ books: 1, captures: 1 });
  });

  it('creates one removed record, a whole book at its start, from the file identity for an absent book and holds every capture under it', () => {
    const plan = planCapturesImport(
      read([
        { book: ELSEWHERE, capture: bookless('c1') },
        { book: ELSEWHERE, capture: bookless('c2') },
      ]),
      holdings(),
      minting(),
    );

    expect(plan.records).toEqual([
      {
        id: 'minted-1',
        title: 'Kiki',
        alias: 'Witch',
        seriesId: null,
        volume: null,
        language: 'ja',
        layoutKind: 'flow',
        direction: 'ltr',
        pagePairing: 'auto',
        pageFit: 'width',
        sourceKind: 'epub',
        contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        fileName: 'kiki.epub',
        imageCount: 0,
        addedAt: 500,
        position: START_OF_THE_TEXT,
        lastReadAt: null,
        finishedAt: null,
        removedAt: 500,
      },
    ]);
    expect(
      plan.captures.map((planned) => planned.kind === 'new' && planned.capture.bookId),
    ).toEqual(['minted-1', 'minted-1']);
    expect(plan.summary.notOnThisDevice).toEqual({ books: 1, captures: 2 });
  });

  it('keeps the series id and volume of a file book in the removed record it creates', () => {
    const inSeries = { ...ELSEWHERE, seriesId: seriesId('series-1'), volume: 2 };

    const plan = planCapturesImport(
      read([{ book: inSeries, capture: bookless('c1') }]),
      holdings(),
      minting(),
    );

    expect(plan.records).toHaveLength(1);
    expect(plan.records[0]).toMatchObject({ seriesId: 'series-1', volume: 2 });
  });

  it('creates no record for an absent book whose captures are all held on this device already', () => {
    const plan = planCapturesImport(
      read([{ book: ELSEWHERE, capture: bookless('c1') }]),
      holdings({ captures: [local('c1', 'shelf-1')] }),
      minting(),
    );

    expect(plan.books[0]?.match.kind).toBe('absent');
    expect(plan.records).toEqual([]);
  });

  it('maps a file tag to the local tag with the same name in another case, keeping the local colour', () => {
    const plan = planCapturesImport(
      read([{ book: FILE_BOOK, capture: bookless('c1', { tagIds: [tagId('file-kanji')] }) }], {
        tags: [{ id: tagId('file-kanji'), name: 'KANJI', colour: 'slate', createdAt: 3 }],
      }),
      holdings({ tags: [KANJI] }),
      minting(),
    );

    expect(plan.tags).toEqual([
      {
        kind: 'merged',
        file: { id: 'file-kanji', name: 'KANJI', colour: 'slate', createdAt: 3 },
        into: KANJI,
      },
    ]);
    expect(plan.captures[0]).toMatchObject({ capture: { tagIds: ['tag-kanji'] } });
    expect(plan.summary.newTags).toBe(0);
  });

  it('creates a file tag with a new name under its own id when that id is free', () => {
    const plan = planCapturesImport(
      read([{ book: FILE_BOOK, capture: bookless('c1', { tagIds: [SFX.id] }) }], { tags: [SFX] }),
      holdings({ tags: [KANJI] }),
      minting(),
    );

    expect(plan.tags).toEqual([{ kind: 'created', file: SFX, tag: SFX }]);
    expect(plan.captures[0]).toMatchObject({ capture: { tagIds: ['tag-sfx'] } });
    expect(plan.summary.newTags).toBe(1);
  });

  it('creates a file tag with a new name under a new id when its id is taken locally', () => {
    const plan = planCapturesImport(
      read([{ book: FILE_BOOK, capture: bookless('c1', { tagIds: [SFX.id] }) }], { tags: [SFX] }),
      holdings({ tags: [{ ...KANJI, id: SFX.id }] }),
      minting(),
    );

    expect(plan.tags).toEqual([{ kind: 'created', file: SFX, tag: { ...SFX, id: 'minted-1' } }]);
    expect(plan.captures[0]).toMatchObject({ capture: { tagIds: ['minted-1'] } });
  });

  it('treats the id of an unreadable local tag as taken', () => {
    const plan = planCapturesImport(
      read([], { tags: [SFX] }),
      holdings({ unreadableTagIds: [SFX.id] }),
      minting(),
    );

    expect(plan.tags).toEqual([{ kind: 'created', file: SFX, tag: { ...SFX, id: 'minted-1' } }]);
  });

  it('merges a second file tag into the first when their names differ only in case', () => {
    const plan = planCapturesImport(
      read([], { tags: [SFX, { ...SFX, id: tagId('tag-sfx-2'), name: 'SFX' }] }),
      holdings(),
      minting(),
    );

    expect(plan.tags.map((planned) => planned.kind)).toEqual(['created', 'merged']);
  });

  it('classes a held capture with the same text and note and no new tag as identical', () => {
    const plan = planCapturesImport(
      read([{ book: FILE_BOOK, capture: bookless('c1', { editedAt: 900 }) }]),
      holdings({ captures: [local('c1', 'shelf-1')] }),
      minting(),
    );

    expect(plan.captures).toEqual([{ kind: 'identical', id: 'c1', onAnotherBook: false }]);
    expect(plan.summary).toMatchObject({ added: 0, identical: 1, conflicts: 0 });
  });

  it('classes a held capture whose only difference is a new tag as tags-only, with the tags united', () => {
    const plan = planCapturesImport(
      read([{ book: FILE_BOOK, capture: bookless('c1', { tagIds: [SFX.id] }) }], { tags: [SFX] }),
      holdings({ tags: [KANJI], captures: [local('c1', 'shelf-1', { tagIds: [KANJI.id] })] }),
      minting(),
    );

    expect(plan.captures).toEqual([
      {
        kind: 'tags-only',
        capture: local('c1', 'shelf-1', { tagIds: [KANJI.id, SFX.id] }),
        onAnotherBook: false,
      },
    ]);
    expect(plan.summary).toMatchObject({ identical: 0, tagsOnly: 1, conflicts: 0 });
  });

  it('classes a held capture whose note differs as a conflict carrying both versions and the united tags', () => {
    const device = local('c1', 'shelf-1', { tagIds: [KANJI.id] });
    const plan = planCapturesImport(
      read(
        [{ book: FILE_BOOK, capture: bookless('c1', { note: 'from file', tagIds: [SFX.id] }) }],
        {
          tags: [SFX],
        },
      ),
      holdings({ tags: [KANJI], captures: [device] }),
      minting(),
    );

    expect(plan.captures).toEqual([
      {
        kind: 'conflict',
        conflict: {
          id: 'c1',
          book: FILE_BOOK,
          device,
          file: local('c1', 'shelf-1', { note: 'from file', tagIds: [SFX.id] }),
          tagIds: [KANJI.id, SFX.id],
          onAnotherBook: false,
        },
      },
    ]);
    expect(plan.summary.conflicts).toBe(1);
  });

  it('classes a held capture whose text differs as a conflict', () => {
    const plan = planCapturesImport(
      read([{ book: FILE_BOOK, capture: bookless('c1', { text: 'changed' }) }]),
      holdings({ captures: [local('c1', 'shelf-1')] }),
      minting(),
    );

    expect(plan.captures[0]?.kind).toBe('conflict');
  });

  it('keeps a held capture on its local book when the file puts it under another, and counts it', () => {
    const plan = planCapturesImport(
      read([{ book: FILE_BOOK, capture: bookless('c1', { text: 'changed' }) }]),
      holdings({ captures: [local('c1', 'other-book')] }),
      minting(),
    );

    expect(plan.captures[0]).toMatchObject({
      kind: 'conflict',
      conflict: { file: { bookId: 'other-book' }, onAnotherBook: true },
    });
    expect(plan.summary.onAnotherBook).toBe(1);
  });

  it('counts the unreadable entries and dropped tags the file read reported', () => {
    const plan = planCapturesImport(
      read([], {
        unreadable: [
          { section: 'captures', index: 0, reason: { kind: 'unknown-book', bookKey: 'book-9' } },
        ],
        droppedTags: [{ captureId: captureId('c1'), tagId: tagId('lost') }],
      }),
      holdings(),
      minting(),
    );

    expect(plan.summary).toMatchObject({ unreadable: 1, droppedTags: 1 });
  });
});
