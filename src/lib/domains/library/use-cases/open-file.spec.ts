import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId, ContentHash } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import { applyEdit, defaultPageFit, DEFAULT_PAGE_PAIRING } from '../domain/book/book';
import type { Book, BookEdit } from '../domain/book/book';
import type {
  BookListing,
  LibraryRepository,
  LibraryWrite,
} from '../domain/book/library-repository';
import type { PageOrder } from '../domain/book/page-list';
import { NO_CONTENT_HASH } from '../domain/book/stored-book';
import type { ContentDigest } from '../domain/ingest/content-hasher';
import type { EpubInspectionAnswer } from '../domain/ingest/epub-inspection';
import type { EpubInspector } from '../domain/ingest/epub-inspector';
import type { EpubLayout, EpubPackage, SpineDirection } from '../domain/ingest/epub-package';
import type { PageObstacle } from '../domain/ingest/epub-pages';
import type { BookProtection } from '../domain/ingest/epub-protection';
import type {
  BuiltPages,
  BuiltSource,
  SourceBuild,
  SourceBuilder,
} from '../domain/ingest/source-builder';
import { uploadManifest } from '../domain/ingest/upload-manifest';
import type { UploadReport, UploadStage } from '../domain/ingest/upload-progress';
import { openFile } from './open-file';
import type { OpenFileDeps, OpenFileResult } from './open-file';

const NOW = 1758240000000;

const NEW_ID = 'book-7';

const DIGEST = 'f0e1d2c3';

const UNHASHABLE: ContentDigest = { kind: 'unreadable', cause: 'no hashing here.' };

const LEGACY_DIGEST = 'a'.repeat(64);

const NOT_AN_EPUB: EpubInspectionAnswer = { kind: 'success', inspection: { kind: 'not-an-epub' } };

const WRITTEN: LibraryWrite = { kind: 'success' };

function listing(books: readonly Book[]): BookListing {
  return { kind: 'success', books };
}

function built(source: BuiltSource): SourceBuild {
  return { kind: 'success', source };
}

function openedBook(result: OpenFileResult): Book {
  if (result.kind !== 'added' && result.kind !== 'already-held') {
    throw new Error(`The upload answered ${result.kind}`);
  }
  return result.book;
}

type BuiltImages = Extract<BuiltPages, { readonly kind: 'images' }>;

const COVER = new Blob(['cover bytes']);

const LISTED: PageOrder = { kind: 'listed', names: ['001.jpg', '002.jpg'] };

function builtImages(overrides: Partial<BuiltImages> = {}): BuiltImages {
  return { kind: 'images', imageCount: 182, cover: COVER, order: LISTED, ...overrides };
}

function builtSource(overrides: Partial<BuiltSource> = {}): BuiltSource {
  return {
    blob: new Blob(['source bytes']),
    sourceKind: 'archive',
    suggestedTitle: 'Yotsuba&! 1',
    pages: builtImages(),
    ...overrides,
  };
}

function builtFlow(obstacle: PageObstacle, cover: Blob | null = null): BuiltSource {
  return builtSource({ sourceKind: 'epub', pages: { kind: 'unpaged', obstacle, cover } });
}

type AddCall = {
  readonly book: Book;
  readonly source: Blob;
  readonly cover: Blob | null;
  readonly order: PageOrder;
};

function heldBook(hash: ContentHash): Book {
  return {
    id: bookId('book-1'),
    title: 'Yotsuba&! 1',
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: DEFAULT_PAGE_PAIRING,
    pageFit: defaultPageFit('paged'),
    sourceKind: 'archive',
    contentHash: hash,
    fileName: 'Yotsuba&! 1.cbz',
    imageCount: 182,
    addedAt: 1758240000000,
    position: imagePlace(imageIndex(9)),
    lastReadAt: null,
    finishedAt: null,
  };
}

function fakeRepository(
  outcome: LibraryWrite = WRITTEN,
  writes: readonly (readonly [number, number])[] = [],
  held: BookListing = listing([]),
) {
  const added: AddCall[] = [];
  const updated: (readonly [BookId, BookEdit])[] = [];
  const repository: LibraryRepository = {
    list: () => Promise.resolve(held),
    get: () => Promise.resolve({ kind: 'success', book: null }),
    add: (book, source, cover, order, report) => {
      added.push({ book, source, cover, order });
      for (const [written, total] of writes) report(written, total);
      return Promise.resolve(outcome);
    },
    remove: () => Promise.resolve(WRITTEN),
    update: (id, edit) => {
      updated.push([id, edit]);
      const book = held.kind === 'success' ? held.books.find((each) => each.id === id) : undefined;
      return Promise.resolve({
        kind: 'success',
        book: book === undefined ? null : applyEdit(book, edit),
      });
    },
    readSource: () => Promise.resolve({ kind: 'success', file: null }),
    readCover: () => Promise.resolve({ kind: 'success', file: null }),
    storedBytes: () => Promise.resolve({ kind: 'success', bytes: 0 }),
    readPageList: () => Promise.resolve({ kind: 'success', pageList: { kind: 'unlisted' } }),
    savePageList: () => Promise.resolve(WRITTEN),
  };
  return { repository, added, updated };
}

function fakeBuilder(outcome: SourceBuild, stages: readonly UploadStage[] = []) {
  const calls: (readonly File[])[] = [];
  const builder: SourceBuilder = {
    build: (files, report) => {
      calls.push(files);
      for (const stage of stages) report(stage);
      return Promise.resolve(outcome);
    },
  };
  return { builder, calls };
}

function clock(times: readonly number[]): () => number {
  let reading = 0;
  return () => {
    const time = times[Math.min(reading, times.length - 1)] ?? 0;
    reading += 1;
    return time;
  };
}

function collector(): { readonly report: UploadReport; readonly stages: UploadStage[] } {
  const stages: UploadStage[] = [];
  return { report: (stage) => stages.push(stage), stages };
}

function fakeInspector(outcome: EpubInspectionAnswer = NOT_AN_EPUB): {
  readonly inspector: EpubInspector;
  readonly inspected: Blob[];
} {
  const inspected: Blob[] = [];
  return {
    inspected,
    inspector: (source: Blob) => {
      inspected.push(source);
      return Promise.resolve(outcome);
    },
  };
}

function epubPackage(
  layout: EpubLayout,
  direction: SpineDirection = 'rtl',
  language: string | null = 'ja',
): EpubPackage {
  return { layout, direction, title: 'Yotsuba&! 1', language };
}

function inspectedEpub(
  layout: EpubLayout,
  direction: SpineDirection = 'rtl',
  language: string | null = 'ja',
): EpubInspectionAnswer {
  return {
    kind: 'success',
    inspection: {
      kind: 'epub',
      packagePath: 'OEBPS/content.opf',
      packageDocument: epubPackage(layout, direction, language),
    },
  };
}

function deps(over: Partial<OpenFileDeps> = {}): OpenFileDeps {
  return {
    repository: fakeRepository().repository,
    builder: fakeBuilder(built(builtSource())).builder,
    inspectEpub: fakeInspector().inspector,
    partialMd5: () => Promise.resolve(digested(DIGEST)),
    legacyFingerprint: () => Promise.resolve(digested(LEGACY_DIGEST)),
    requestPersistence: () => Promise.resolve(true),
    now: () => NOW,
    newId: () => NEW_ID,
    ...over,
  };
}

function digested(digest: string): ContentDigest {
  return { kind: 'success', digest };
}

function fakeFingerprint(digest: string = DIGEST) {
  const hashed: Blob[] = [];
  return {
    hashed,
    fingerprint: (blob: Blob) => {
      hashed.push(blob);
      return Promise.resolve(digested(digest));
    },
  };
}

function inFolder(file: File, path: string): File {
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
}

const files: readonly File[] = [inFolder(new File(['bytes'], 'Yotsuba&! 1.cbz'), '')];

const epub: readonly File[] = [inFolder(new File(['bytes'], 'Yotsuba&! 1.epub'), '')];

const folder: readonly File[] = [
  inFolder(new File(['0123456789'], '002.png'), 'Ch 12/002.png'),
  inFolder(new File(['01234'], '001.png'), 'Ch 12/001.png'),
];

describe('openFile', () => {
  it('returns the stored book on the happy path', async () => {
    const repository = fakeRepository();
    const result = await openFile(deps({ repository: repository.repository }), files);
    expect(result.kind).toBe('added');
    expect(openedBook(result).title).toBe('Yotsuba&! 1');
  });

  it('stores exactly the book it answers as added', async () => {
    const repository = fakeRepository();
    const result = await openFile(deps({ repository: repository.repository }), files);
    expect(repository.added).toHaveLength(1);
    expect(result).toEqual({
      kind: 'added',
      book: at(repository.added, 0).book,
    });
  });

  it('stores the page list the builder made with the book', async () => {
    const repository = fakeRepository();

    await openFile(deps({ repository: repository.repository }), files);

    expect(at(repository.added, 0).order).toEqual(LISTED);
  });

  it('stores the source blob and the cover the builder produced', async () => {
    const source = builtSource();
    const repository = fakeRepository();
    const builder = fakeBuilder(built(source));
    await openFile(deps({ repository: repository.repository, builder: builder.builder }), files);
    expect(at(repository.added, 0).source).toBe(source.blob);
    expect(at(repository.added, 0).cover).toBe(COVER);
  });

  it('uses the injected id, time and title', async () => {
    const builder = fakeBuilder(built(builtSource({ suggestedTitle: 'Nichijou 3' })));
    const result = await openFile(
      deps({ builder: builder.builder, now: () => 42, newId: () => 'b-99' }),
      files,
    );
    expect(openedBook(result).id).toBe('b-99');
    expect(openedBook(result).addedAt).toBe(42);
    expect(openedBook(result).title).toBe('Nichijou 3');
  });

  it('defaults a new book to Japanese, paged, right to left, two pages after a cover, at the first image', async () => {
    const result = await openFile(deps(), files);
    expect(openedBook(result).language).toBe('ja');
    expect(openedBook(result).layoutKind).toBe('paged');
    expect(openedBook(result).direction).toBe('rtl');
    expect(openedBook(result).pagePairing).toBe(DEFAULT_PAGE_PAIRING);
    expect(openedBook(result).position).toEqual({
      kind: 'image',
      index: 0,
      shownThrough: 0,
      offset: 0,
    });
  });

  it('gives a new book no last read time and no finished mark', async () => {
    const result = await openFile(deps({ now: () => 42 }), files);
    expect(openedBook(result).lastReadAt).toBeNull();
    expect(openedBook(result).finishedAt).toBeNull();
  });

  it('reads Korean from a hangul title, so the reader does not have to say so', async () => {
    const builder = fakeBuilder(built(builtSource({ suggestedTitle: '나 혼자만 레벨업' }))).builder;

    const result = await openFile(deps({ builder }), files);

    expect(openedBook(result).language).toBe('ko');
  });

  it('reads Japanese from a kana title', async () => {
    const builder = fakeBuilder(built(builtSource({ suggestedTitle: 'よつばと！' }))).builder;

    const result = await openFile(deps({ builder }), files);

    expect(openedBook(result).language).toBe('ja');
  });

  it('falls back to Japanese when the title says nothing', async () => {
    const builder = fakeBuilder(built(builtSource({ suggestedTitle: 'One Piece v01' }))).builder;

    const result = await openFile(deps({ builder }), files);

    expect(openedBook(result).language).toBe('ja');
  });

  it('defaults a new book to the fit its layout kind asks for', async () => {
    const result = await openFile(deps(), files);
    expect(openedBook(result).pageFit).toBe(defaultPageFit('paged'));
  });

  it('carries the source kind and the image count the builder reported', async () => {
    const builder = fakeBuilder(
      built(builtSource({ sourceKind: 'pdf', pages: builtImages({ imageCount: 7 }) })),
    );
    const result = await openFile(deps({ builder: builder.builder }), files);
    expect(openedBook(result).sourceKind).toBe('pdf');
    expect(openedBook(result).imageCount).toBe(7);
  });

  it('hands the builder the files it was given', async () => {
    const builder = fakeBuilder(built(builtSource()));
    await openFile(deps({ builder: builder.builder }), files);
    expect(builder.calls).toEqual([files]);
  });

  it('requests the persistence grant', async () => {
    let requested = 0;
    await openFile(
      deps({
        requestPersistence: () => {
          requested += 1;
          return Promise.resolve(true);
        },
      }),
      files,
    );
    expect(requested).toBe(1);
  });

  it('requests the persistence grant before it builds the source', async () => {
    const order: string[] = [];
    const builder: SourceBuilder = {
      build: () => {
        order.push('build');
        return Promise.resolve(built(builtSource()));
      },
    };
    await openFile(
      deps({
        builder,
        requestPersistence: () => {
          order.push('persist');
          return Promise.resolve(true);
        },
      }),
      files,
    );
    expect(order).toEqual(['persist', 'build']);
  });

  it('completes the upload when the persistence grant is refused', async () => {
    const repository = fakeRepository();
    const result = await openFile(
      deps({ repository: repository.repository, requestPersistence: () => Promise.resolve(false) }),
      files,
    );
    expect(result.kind).toBe('added');
    expect(repository.added).toHaveLength(1);
  });

  it('reports a builder failure as a source error', async () => {
    const builder = fakeBuilder({ kind: 'nothing-usable' });
    const result = await openFile(deps({ builder: builder.builder }), files);
    expect(result).toEqual({ kind: 'source', failure: { kind: 'nothing-usable' } });
  });

  it('stores nothing when the builder fails', async () => {
    const repository = fakeRepository();
    const builder = fakeBuilder({ kind: 'empty' });
    await openFile(deps({ repository: repository.repository, builder: builder.builder }), files);
    expect(repository.added).toEqual([]);
  });

  it('passes a blocked store through when the book will not store', async () => {
    const repository = fakeRepository(STORAGE_UNAVAILABLE);
    const result = await openFile(deps({ repository: repository.repository }), files);
    expect(result).toEqual(STORAGE_UNAVAILABLE);
  });

  it('leaves the reading position typed as a reading place', async () => {
    const result = await openFile(deps(), files);
    const position: ReadingPlace = openedBook(result).position;
    expect(position).toEqual({ kind: 'image', index: 0, shownThrough: 0, offset: 0 });
  });

  it('forwards every stage the builder reported', async () => {
    const seen = collector();
    const builder = fakeBuilder(built(builtSource()), [
      { kind: 'inspecting' },
      { kind: 'opening', sourceKind: 'archive' },
      { kind: 'covering', imageCount: 182 },
    ]);
    await openFile(deps({ builder: builder.builder }), files, seen.report);
    expect(seen.stages).toEqual([
      { kind: 'inspecting' },
      { kind: 'opening', sourceKind: 'archive' },
      { kind: 'covering', imageCount: 182 },
    ]);
  });

  it('reports the bytes the repository wrote as a storing stage carrying the image count', async () => {
    const seen = collector();
    const repository = fakeRepository(WRITTEN, [
      [0, 400],
      [200, 400],
      [400, 400],
    ]);
    await openFile(
      deps({ repository: repository.repository, now: clock([NOW, 1000, 1500, 3000, 5000]) }),
      files,
      seen.report,
    );
    expect(seen.stages).toEqual([
      { kind: 'storing', imageCount: 182, writtenBytes: 0, totalBytes: 400, elapsedMs: 500 },
      { kind: 'storing', imageCount: 182, writtenBytes: 200, totalBytes: 400, elapsedMs: 2000 },
      { kind: 'storing', imageCount: 182, writtenBytes: 400, totalBytes: 400, elapsedMs: 4000 },
    ]);
  });

  it('measures the storing elapsed time from the injected clock, not from the book time', async () => {
    const seen = collector();
    const repository = fakeRepository(WRITTEN, [[64, 128]]);
    const result = await openFile(
      deps({ repository: repository.repository, now: clock([7, 100, 900]) }),
      files,
      seen.report,
    );
    expect(openedBook(result).addedAt).toBe(7);
    expect(at(seen.stages, 0)).toEqual({
      kind: 'storing',
      imageCount: 182,
      writtenBytes: 64,
      totalBytes: 128,
      elapsedMs: 800,
    });
  });

  it('fingerprints the one file it was handed', async () => {
    const hashing = fakeFingerprint();

    await openFile(deps({ partialMd5: hashing.fingerprint }), files);

    expect(hashing.hashed).toEqual([at(files, 0)]);
  });

  it('returns a fingerprint failure for an unreadable upload, and stores nothing', async () => {
    const repository = fakeRepository();
    const builder = fakeBuilder(built(builtSource()));

    const result = await openFile(
      deps({
        repository: repository.repository,
        builder: builder.builder,
        partialMd5: () => Promise.resolve(UNHASHABLE),
      }),
      files,
    );

    expect(result).toEqual({ kind: 'fingerprint', cause: 'no hashing here.' });
    expect(repository.added).toEqual([]);
    expect(builder.calls).toEqual([]);
  });

  it('fingerprints the sorted names and sizes of a folder of images', async () => {
    const hashing = fakeFingerprint();

    await openFile(deps({ partialMd5: hashing.fingerprint }), folder);

    expect(await at(hashing.hashed, 0).text()).toBe(uploadManifest(folder));
  });

  it('fingerprints a folder of images with junk files beside its pages as it does the pages alone', async () => {
    const alone = fakeFingerprint();
    const withJunk = fakeFingerprint();
    const junk = [
      inFolder(new File(['finder state'], '.DS_Store'), 'Ch 12/.DS_Store'),
      inFolder(new File(['fork'], '._001.png'), 'Ch 12/._001.png'),
      inFolder(new File(['cache'], 'Thumbs.db'), 'Ch 12/Thumbs.db'),
      inFolder(new File(['credits'], 'notes.txt'), 'Ch 12/notes.txt'),
    ];

    await openFile(deps({ partialMd5: alone.fingerprint }), folder);
    await openFile(deps({ partialMd5: withJunk.fingerprint }), [...junk, ...folder]);

    expect(await at(withJunk.hashed, 0).text()).toBe(await at(alone.hashed, 0).text());
  });

  it('fingerprints the one page of a folder whose other files are junk as that page', async () => {
    const hashing = fakeFingerprint();
    const page = inFolder(new File(['01234'], '001.png'), 'Ch 1/001.png');

    await openFile(deps({ partialMd5: hashing.fingerprint }), [
      inFolder(new File(['finder state'], '.DS_Store'), 'Ch 1/.DS_Store'),
      page,
    ]);

    expect(hashing.hashed).toEqual([page]);
  });

  it('reads the same manifest whichever order a folder arrives in', async () => {
    const one = fakeFingerprint();
    const other = fakeFingerprint();

    await openFile(deps({ partialMd5: one.fingerprint }), folder);
    await openFile(deps({ partialMd5: other.fingerprint }), folder.toReversed());

    expect(await at(one.hashed, 0).text()).toBe(await at(other.hashed, 0).text());
  });

  it('stores the fingerprint on the new book', async () => {
    const repository = fakeRepository();

    const result = await openFile(
      deps({
        repository: repository.repository,
        partialMd5: () => Promise.resolve(digested('beef01')),
      }),
      files,
    );

    expect(openedBook(result).contentHash).toBe('beef01');
    expect(at(repository.added, 0).book.contentHash).toBe('beef01');
  });

  it('answers already-held with the book it holds when the fingerprint matches', async () => {
    const known = heldBook(contentHash(DIGEST));
    const repository = fakeRepository(WRITTEN, [], listing([known]));

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(result).toEqual({ kind: 'already-held', book: known });
  });

  it('stores nothing and builds nothing when the fingerprint matches', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([heldBook(contentHash(DIGEST))]));
    const builder = fakeBuilder(built(builtSource()));

    await openFile(deps({ repository: repository.repository, builder: builder.builder }), files);

    expect(repository.added).toEqual([]);
    expect(builder.calls).toEqual([]);
  });

  it('imports a file no held book carries the fingerprint of', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([heldBook(contentHash('other'))]));

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(repository.added).toHaveLength(1);
    expect(openedBook(result).id).toBe(NEW_ID);
  });

  it('imports a file although a book stored before fingerprints carries none', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([heldBook(NO_CONTENT_HASH)]));

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(repository.added).toHaveLength(1);
    expect(openedBook(result).id).toBe(NEW_ID);
  });

  it('computes no legacy fingerprint while no held book carries one', async () => {
    const legacy = fakeFingerprint(LEGACY_DIGEST);
    const repository = fakeRepository(WRITTEN, [], listing([heldBook(contentHash('other'))]));

    await openFile(
      deps({ repository: repository.repository, legacyFingerprint: legacy.fingerprint }),
      files,
    );

    expect(legacy.hashed).toEqual([]);
  });

  it('rejoins a book stored with the legacy fingerprint and upgrades its hash and name', async () => {
    const known = { ...heldBook(contentHash(LEGACY_DIGEST)), fileName: '' };
    const repository = fakeRepository(WRITTEN, [], listing([known]));
    const builder = fakeBuilder(built(builtSource()));

    const result = await openFile(
      deps({ repository: repository.repository, builder: builder.builder }),
      files,
    );

    expect(repository.updated).toEqual([
      [known.id, { contentHash: DIGEST, fileName: 'Yotsuba&! 1.cbz' }],
    ]);
    expect(result).toEqual({
      kind: 'already-held',
      book: { ...known, contentHash: DIGEST, fileName: 'Yotsuba&! 1.cbz' },
    });
    expect(repository.added).toEqual([]);
    expect(builder.calls).toEqual([]);
  });

  it('imports a file whose legacy fingerprint no held book carries', async () => {
    const repository = fakeRepository(
      WRITTEN,
      [],
      listing([heldBook(contentHash('b'.repeat(64)))]),
    );

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(repository.added).toHaveLength(1);
    expect(repository.updated).toEqual([]);
    expect(result.kind).toBe('added');
  });

  it('returns a fingerprint failure when a legacy book is held and no legacy hash can be made', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([heldBook(contentHash(LEGACY_DIGEST))]));

    const result = await openFile(
      deps({
        repository: repository.repository,
        legacyFingerprint: () => Promise.resolve(UNHASHABLE),
      }),
      files,
    );

    expect(result).toEqual({ kind: 'fingerprint', cause: 'no hashing here.' });
    expect(repository.added).toEqual([]);
  });

  it('passes a blocked store through when a legacy hash cannot be upgraded', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([heldBook(contentHash(LEGACY_DIGEST))]));
    const failing: LibraryRepository = {
      ...repository.repository,
      update: () => Promise.resolve(STORAGE_UNAVAILABLE),
    };

    const result = await openFile(deps({ repository: failing }), files);

    expect(result).toEqual(STORAGE_UNAVAILABLE);
  });

  it('answers not-found when the legacy book is removed before its hash is upgraded', async () => {
    const known = heldBook(contentHash(LEGACY_DIGEST));
    const repository = fakeRepository(WRITTEN, [], listing([known]));
    const removed: LibraryRepository = {
      ...repository.repository,
      update: () => Promise.resolve({ kind: 'success', book: null }),
    };

    const result = await openFile(deps({ repository: removed }), files);

    expect(result).toEqual({ kind: 'not-found', id: known.id });
  });

  it('stores the uploaded file name on the new book', async () => {
    const repository = fakeRepository();

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(openedBook(result).fileName).toBe('Yotsuba&! 1.cbz');
    expect(at(repository.added, 0).book.fileName).toBe('Yotsuba&! 1.cbz');
  });

  it('stores the folder name on a book made from a folder', async () => {
    const repository = fakeRepository();

    await openFile(deps({ repository: repository.repository }), folder);

    expect(at(repository.added, 0).book.fileName).toBe('Ch 12');
  });

  it('joins a book by its file name when matching by file name, although the bytes differ', async () => {
    const known = heldBook(contentHash('other'));
    const repository = fakeRepository(WRITTEN, [], listing([known]));
    const builder = fakeBuilder(built(builtSource()));

    const result = await openFile(
      deps({ repository: repository.repository, builder: builder.builder }),
      files,
      () => undefined,
      'file-name',
    );

    expect(result).toEqual({ kind: 'already-held', book: known });
    expect(builder.calls).toEqual([]);
  });

  it('imports a renamed copy of a file name it holds when matching by content', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([heldBook(contentHash('other'))]));

    const result = await openFile(
      deps({ repository: repository.repository }),
      files,
      () => undefined,
      'content',
    );

    expect(result.kind).toBe('added');
  });

  it('passes a blocked store through when the library cannot be read', async () => {
    const repository = fakeRepository(WRITTEN, [], STORAGE_UNAVAILABLE);

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(result).toEqual(STORAGE_UNAVAILABLE);
  });

  it('inspects an uploaded EPUB before it builds a source from it', async () => {
    const inspector = fakeInspector(inspectedEpub('pre-paginated'));
    const builder = fakeBuilder(built(builtSource({ sourceKind: 'epub' })));

    const result = await openFile(
      deps({ inspectEpub: inspector.inspector, builder: builder.builder }),
      epub,
    );

    expect(inspector.inspected).toEqual([at(epub, 0)]);
    expect(result.kind).toBe('added');
  });

  it('takes the language the EPUB itself declares, not one guessed from a title', async () => {
    const result = await openFile(
      deps({
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated', 'rtl', 'ko-KR')).inspector,
        builder: fakeBuilder(built(builtSource({ sourceKind: 'epub' }))).builder,
      }),
      epub,
    );

    expect(openedBook(result).language).toBe('ko');
  });

  it('opens an EPUB declaring English as English, whatever its Latin title looks like', async () => {
    const result = await openFile(
      deps({
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated', 'rtl', 'en-GB')).inspector,
        builder: fakeBuilder(built(builtSource({ sourceKind: 'epub', suggestedTitle: 'Watchmen' })))
          .builder,
      }),
      epub,
    );

    expect(openedBook(result).language).toBe('en');
  });

  it('falls back to the title when the EPUB declares a language this app cannot read', async () => {
    const result = await openFile(
      deps({
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated', 'rtl', 'zh-Hans')).inspector,
        builder: fakeBuilder(
          built(builtSource({ sourceKind: 'epub', suggestedTitle: '\uB098 \uD63C\uC790\uB9CC' })),
        ).builder,
      }),
      epub,
    );

    expect(openedBook(result).language).toBe('ko');
  });

  it('takes the reading direction the EPUB itself declares', async () => {
    const repository = fakeRepository();

    const result = await openFile(
      deps({
        repository: repository.repository,
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated', 'ltr')).inspector,
        builder: fakeBuilder(built(builtSource({ sourceKind: 'epub' }))).builder,
      }),
      epub,
    );

    expect(openedBook(result).direction).toBe('ltr');
  });

  it('reads an EPUB that declares no direction left to right, as the format says', async () => {
    const result = await openFile(
      deps({
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated', 'default')).inspector,
        builder: fakeBuilder(built(builtSource({ sourceKind: 'epub' }))).builder,
      }),
      epub,
    );

    expect(openedBook(result).direction).toBe('ltr');
  });

  it('keeps the manga default for an upload that is no EPUB at all', async () => {
    const result = await openFile(deps(), files);

    expect(openedBook(result).direction).toBe('rtl');
  });

  it('imports a fixed-layout EPUB', async () => {
    const repository = fakeRepository();
    const result = await openFile(
      deps({
        repository: repository.repository,
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated')).inspector,
        builder: fakeBuilder(built(builtSource({ sourceKind: 'epub' }))).builder,
      }),
      epub,
    );

    expect(openedBook(result).sourceKind).toBe('epub');
    expect(repository.added).toHaveLength(1);
  });

  it('stores an EPUB declaring reflowable whose every page is one image', async () => {
    const repository = fakeRepository();
    const builder = fakeBuilder(built(builtSource({ sourceKind: 'epub' })));

    const result = await openFile(
      deps({
        repository: repository.repository,
        builder: builder.builder,
        inspectEpub: fakeInspector(inspectedEpub('reflowable')).inspector,
      }),
      epub,
    );

    expect(builder.calls).toEqual([epub]);
    expect(openedBook(result).sourceKind).toBe('epub');
    expect(repository.added).toHaveLength(1);
  });

  it('imports an EPUB declaring reflowable whose pages are not images as a flow book', async () => {
    const repository = fakeRepository();
    const obstacle: PageObstacle = { kind: 'no-image', path: 'OEBPS/ch01.xhtml' };
    const builder = fakeBuilder(built(builtFlow(obstacle)));

    const result = await openFile(
      deps({
        repository: repository.repository,
        builder: builder.builder,
        inspectEpub: fakeInspector(inspectedEpub('reflowable')).inspector,
      }),
      epub,
    );

    expect(openedBook(result).layoutKind).toBe('flow');
    expect(openedBook(result).sourceKind).toBe('epub');
    expect(repository.added).toHaveLength(1);
  });

  it('stores a flow book with no images, a place in its text and the cover the builder lifted', async () => {
    const repository = fakeRepository();
    const builder = fakeBuilder(
      built(builtFlow({ kind: 'no-image', path: 'OEBPS/ch01.xhtml' }, COVER)),
    );

    const result = await openFile(
      deps({
        repository: repository.repository,
        builder: builder.builder,
        inspectEpub: fakeInspector(inspectedEpub('reflowable')).inspector,
      }),
      epub,
    );

    expect(openedBook(result).imageCount).toBe(0);
    expect(openedBook(result).position).toEqual({
      kind: 'text',
      cfi: '',
      fraction: null,
    });
    expect(at(repository.added, 0).cover).toBe(COVER);
  });

  it('stores a flow book with the order its EPUB gives it, not a page list', async () => {
    const repository = fakeRepository();
    const builder = fakeBuilder(built(builtFlow({ kind: 'no-image', path: 'OEBPS/ch01.xhtml' })));

    await openFile(
      deps({
        repository: repository.repository,
        builder: builder.builder,
        inspectEpub: fakeInspector(inspectedEpub('reflowable')).inspector,
      }),
      epub,
    );

    expect(at(repository.added, 0).order).toEqual({ kind: 'intrinsic' });
  });

  it('stores a flow book whose EPUB names no cover with none', async () => {
    const repository = fakeRepository();
    const builder = fakeBuilder(built(builtFlow({ kind: 'no-image', path: 'OEBPS/ch01.xhtml' })));

    await openFile(
      deps({
        repository: repository.repository,
        builder: builder.builder,
        inspectEpub: fakeInspector(inspectedEpub('reflowable')).inspector,
      }),
      epub,
    );

    expect(at(repository.added, 0).cover).toBeNull();
  });

  it('keeps the pairing and the fit a flow book never reads', async () => {
    const builder = fakeBuilder(built(builtFlow({ kind: 'no-image', path: 'OEBPS/ch01.xhtml' })));

    const result = await openFile(
      deps({
        builder: builder.builder,
        inspectEpub: fakeInspector(inspectedEpub('reflowable')).inspector,
      }),
      epub,
    );

    expect(openedBook(result).pagePairing).toBe(DEFAULT_PAGE_PAIRING);
    expect(openedBook(result).pageFit).toBe(defaultPageFit('flow'));
  });

  it('imports an EPUB declaring reflowable whose every page is one image as a paged book', async () => {
    const result = await openFile(
      deps({
        builder: fakeBuilder(built(builtSource({ sourceKind: 'epub' }))).builder,
        inspectEpub: fakeInspector(inspectedEpub('reflowable')).inspector,
      }),
      epub,
    );

    expect(openedBook(result).layoutKind).toBe('paged');
    expect(openedBook(result).position).toEqual({
      kind: 'image',
      index: 0,
      shownThrough: 0,
      offset: 0,
    });
  });

  it('carries the protection of a locked EPUB out to its caller', async () => {
    const protection: BookProtection = { kind: 'rights-managed' };
    const inspector = fakeInspector({ kind: 'protected', protection }).inspector;

    const result = await openFile(deps({ inspectEpub: inspector }), epub);

    expect(result).toEqual({ kind: 'epub', failure: { kind: 'protected', protection } });
  });

  it('refuses an ineligible fixed-layout EPUB with the obstacle the builder named, and stores nothing', async () => {
    const repository = fakeRepository();
    const obstacle: PageObstacle = { kind: 'many-images', path: 'OEBPS/p3.xhtml', count: 2 };
    const builder = fakeBuilder(built(builtFlow(obstacle)));

    const result = await openFile(
      deps({
        repository: repository.repository,
        builder: builder.builder,
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated')).inspector,
      }),
      epub,
    );

    expect(result).toEqual({ kind: 'not-paged', obstacle });
    expect(repository.added).toEqual([]);
  });

  it('refuses an unpaged upload that is no EPUB at all', async () => {
    const obstacle: PageObstacle = { kind: 'no-image', path: 'OEBPS/ch01.xhtml' };

    const result = await openFile(
      deps({ builder: fakeBuilder(built(builtFlow(obstacle))).builder }),
      files,
    );

    expect(result).toEqual({ kind: 'not-paged', obstacle });
  });

  it('inspects no EPUB when the upload is an archive', async () => {
    const inspector = fakeInspector();

    await openFile(deps({ inspectEpub: inspector.inspector }), files);

    expect(inspector.inspected).toEqual([]);
  });

  it('builds a source from a .epub the inspection calls no EPUB at all', async () => {
    const builder = fakeBuilder(built(builtSource({ sourceKind: 'epub' })));

    const result = await openFile(deps({ builder: builder.builder }), epub);

    expect(builder.calls).toEqual([epub]);
    expect(result.kind).toBe('added');
  });

  it('reports nothing when no reporter is given', async () => {
    const repository = fakeRepository(WRITTEN, [[1, 2]]);
    const result = await openFile(deps({ repository: repository.repository }), files);
    expect(result.kind).toBe('added');
  });
});
