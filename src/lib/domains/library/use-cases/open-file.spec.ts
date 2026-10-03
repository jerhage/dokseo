import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { ContentHash } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from '../domain/book/book';
import type { Book } from '../domain/book/book';
import { NOTHING_TO_MERGE } from '../domain/book/book-merge';
import type { BookMerge, MergeInto } from '../domain/book/book-merge';
import type {
  BookListing,
  LibraryRepository,
  LibraryWrite,
} from '../domain/book/library-repository';
import type { PageOrder } from '../domain/book/page-list';
import type { RemovedBook } from '../domain/book/removed-book';
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

const NOT_AN_EPUB: EpubInspectionAnswer = { kind: 'success', inspection: { kind: 'not-an-epub' } };

const WRITTEN: LibraryWrite = { kind: 'success' };

function listing(books: readonly Book[]): BookListing {
  return { kind: 'success', books, unreadable: [] };
}

function built(source: BuiltSource): SourceBuild {
  return { kind: 'success', source };
}

function openedBook(result: OpenFileResult): Book {
  if (result.kind !== 'added' && result.kind !== 'restored' && result.kind !== 'already-held') {
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
    metadataTitle: null,
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
    alias: null,
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
  restorable: readonly RemovedBook[] = [],
  unreadable: readonly RemovedBook[] = [],
) {
  const added: AddCall[] = [];
  const repository: LibraryRepository = {
    list: () => Promise.resolve(held),
    get: () => Promise.resolve({ kind: 'success', book: null }),
    add: (book, source, cover, order, report) => {
      added.push({ book, source, cover, order });
      for (const [written, total] of writes) report(written, total);
      return Promise.resolve(outcome);
    },
    remove: () => Promise.resolve(WRITTEN),
    update: () => Promise.resolve({ kind: 'success', book: null }),
    readSource: () => Promise.resolve({ kind: 'success', file: null }),
    readCover: () => Promise.resolve({ kind: 'success', file: null }),
    storedBytes: () => Promise.resolve({ kind: 'success', bytes: 0 }),
    readPageList: () => Promise.resolve({ kind: 'success', pageList: { kind: 'unlisted' } }),
    savePageList: () => Promise.resolve(WRITTEN),
    listRemoved: () => Promise.resolve({ kind: 'success', removed: [] }),
    listRestorable: () => Promise.resolve({ kind: 'success', removed: restorable, unreadable }),
    addRemoved: () => Promise.reject(new Error('not used')),
    forgetRemoved: () => Promise.resolve({ kind: 'success' }),
  };
  return { repository, added };
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

function collector(): {
  readonly report: UploadReport;
  readonly stages: UploadStage[];
  readonly titles: string[];
} {
  const stages: UploadStage[] = [];
  const titles: string[] = [];
  return {
    report: (event) => {
      if (event.kind === 'titled') titles.push(event.title);
      else stages.push(event);
    },
    stages,
    titles,
  };
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
  title: string | null = 'Yotsuba&! 1',
): EpubPackage {
  return { layout, direction, title, language };
}

function inspectedEpub(
  layout: EpubLayout,
  direction: SpineDirection = 'rtl',
  language: string | null = 'ja',
  title: string | null = 'Yotsuba&! 1',
): EpubInspectionAnswer {
  return {
    kind: 'success',
    inspection: {
      kind: 'epub',
      packagePath: 'OEBPS/content.opf',
      packageDocument: epubPackage(layout, direction, language, title),
    },
  };
}

type MergeCall = { readonly into: string; readonly strays: readonly string[] };

function fakeMerge(outcome: BookMerge = { kind: 'merged' }): {
  readonly mergeInto: MergeInto;
  readonly calls: MergeCall[];
} {
  const calls: MergeCall[] = [];
  return {
    calls,
    mergeInto: (into, strays) => {
      calls.push({ into, strays });
      return Promise.resolve(outcome);
    },
  };
}

function deps(over: Partial<OpenFileDeps> = {}): OpenFileDeps {
  return {
    repository: fakeRepository().repository,
    mergeInto: fakeMerge().mergeInto,
    builder: fakeBuilder(built(builtSource())).builder,
    inspectEpub: fakeInspector().inspector,
    partialMd5: () => Promise.resolve(digested(DIGEST)),
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

const pdf: readonly File[] = [inFolder(new File(['bytes'], 'scan_0042.pdf'), '')];

const folder: readonly File[] = [
  inFolder(new File(['0123456789'], '002.png'), 'Ch 12/002.png'),
  inFolder(new File(['01234'], '001.png'), 'Ch 12/001.png'),
];

const OTHER_DIGEST = '0123456789abcdef0123456789abcdef';

function removedRecord(overrides: Partial<RemovedBook> = {}): RemovedBook {
  return {
    id: bookId('gone-1'),
    title: 'Yotsuba&! 1',
    alias: null,
    contentHash: OTHER_DIGEST,
    fileName: 'other.cbz',
    language: 'ja',
    direction: 'rtl',
    addedAt: null,
    ...overrides,
  };
}

describe('openFile', () => {
  it('stores exactly the book it answers as added', async () => {
    const repository = fakeRepository();
    const result = await openFile(deps({ repository: repository.repository }), files);
    expect(repository.added).toHaveLength(1);
    expect(result).toEqual({
      kind: 'added',
      book: at(repository.added, 0).book,
    });
  });

  it('stores the source blob, the cover and the page list the builder produced', async () => {
    const source = builtSource();
    const repository = fakeRepository();
    const builder = fakeBuilder(built(source));
    await openFile(deps({ repository: repository.repository, builder: builder.builder }), files);
    expect(at(repository.added, 0).source).toBe(source.blob);
    expect(at(repository.added, 0).cover).toBe(COVER);
    expect(at(repository.added, 0).order).toEqual(LISTED);
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

  it('defaults a new book to Japanese, paged, right to left, two pages after a cover, the paged fit, at the first image, unread and unfinished', async () => {
    const result = await openFile(deps({ now: () => 42 }), files);
    expect(openedBook(result).language).toBe('ja');
    expect(openedBook(result).layoutKind).toBe('paged');
    expect(openedBook(result).direction).toBe('rtl');
    expect(openedBook(result).pagePairing).toBe(DEFAULT_PAGE_PAIRING);
    expect(openedBook(result).pageFit).toBe(defaultPageFit('paged'));
    expect(openedBook(result).position).toEqual({
      kind: 'image',
      index: 0,
      shownThrough: 0,
      offset: 0,
    });
    expect(openedBook(result).lastReadAt).toBeNull();
    expect(openedBook(result).finishedAt).toBeNull();
  });

  it('titles an EPUB by the title its package declares, not its file name', async () => {
    const repository = fakeRepository();

    const result = await openFile(
      deps({
        repository: repository.repository,
        inspectEpub: fakeInspector(
          inspectedEpub('pre-paginated', 'rtl', 'ja', 'キノの旅 the Beautiful World'),
        ).inspector,
        builder: fakeBuilder(built(builtSource({ sourceKind: 'epub', suggestedTitle: 'kino-v1' })))
          .builder,
      }),
      epub,
    );

    expect(openedBook(result).title).toBe('キノの旅 the Beautiful World');
    expect(at(repository.added, 0).book.fileName).toBe('Yotsuba&! 1.epub');
  });

  it.each([null, '   ', 'Untitled', 'C:\\Books\\kino.indd', 'draft.docx'])(
    'titles an EPUB by its file name when the package declares the title %j',
    async (declared) => {
      const result = await openFile(
        deps({
          inspectEpub: fakeInspector(inspectedEpub('pre-paginated', 'rtl', 'ja', declared))
            .inspector,
          builder: fakeBuilder(
            built(builtSource({ sourceKind: 'epub', suggestedTitle: 'kino-v1' })),
          ).builder,
        }),
        epub,
      );

      expect(openedBook(result).title).toBe('kino-v1');
    },
  );

  it.each([
    ['archive', files],
    ['pdf', [inFolder(new File(['bytes'], 'Yotsuba&! 1.pdf'), '')]],
    ['images', folder],
  ] as const)(
    'titles a %s upload by the title its builder suggested',
    async (sourceKind, upload) => {
      const inspector = fakeInspector(inspectedEpub('pre-paginated', 'rtl', 'ja', 'Not this one'));
      const result = await openFile(
        deps({
          inspectEpub: inspector.inspector,
          builder: fakeBuilder(built(builtSource({ sourceKind, suggestedTitle: 'Ch 12' }))).builder,
        }),
        upload,
      );

      expect(openedBook(result).title).toBe('Ch 12');
      expect(inspector.inspected).toEqual([]);
    },
  );

  it('titles a PDF by the title its metadata declares, not its file name', async () => {
    const repository = fakeRepository();

    const result = await openFile(
      deps({
        repository: repository.repository,
        builder: fakeBuilder(
          built(
            builtSource({
              sourceKind: 'pdf',
              suggestedTitle: 'scan_0042',
              metadataTitle: 'よつばと! 1',
            }),
          ),
        ).builder,
      }),
      pdf,
    );

    expect(openedBook(result).title).toBe('よつばと! 1');
    expect(at(repository.added, 0).book.fileName).toBe('scan_0042.pdf');
  });

  it('titles a PDF by its file name when its metadata yields no title, and still adds it', async () => {
    const result = await openFile(
      deps({
        builder: fakeBuilder(
          built(
            builtSource({ sourceKind: 'pdf', suggestedTitle: 'scan_0042', metadataTitle: null }),
          ),
        ).builder,
      }),
      pdf,
    );

    expect(result.kind).toBe('added');
    expect(openedBook(result).title).toBe('scan_0042');
  });

  it.each([
    ['a PDF metadata title', 'pdf', 'scan_0042', 'よつばと! 1', 'よつばと! 1'],
    ['a PDF file-name title', 'pdf', 'scan_0042', null, 'scan_0042'],
    ['an archive file-name title', 'archive', 'Ch 12', null, 'Ch 12'],
  ] as const)(
    'reports %s as the chosen title before it stores the book',
    async (_, sourceKind, suggestedTitle, metadataTitle, chosen) => {
      const order: string[] = [];
      const repository = fakeRepository(WRITTEN, [[0, 1]]);

      await openFile(
        deps({
          repository: repository.repository,
          builder: fakeBuilder(built(builtSource({ sourceKind, suggestedTitle, metadataTitle })))
            .builder,
        }),
        pdf,
        (event) => order.push(event.kind === 'titled' ? `titled ${event.title}` : event.kind),
      );

      expect(order).toEqual([`titled ${chosen}`, 'storing']);
    },
  );

  it('reports the EPUB package title as the chosen title', async () => {
    const seen = collector();

    await openFile(
      deps({
        inspectEpub: fakeInspector(
          inspectedEpub('pre-paginated', 'rtl', 'ja', 'キノの旅 the Beautiful World'),
        ).inspector,
        builder: fakeBuilder(built(builtSource({ sourceKind: 'epub', suggestedTitle: 'kino-v1' })))
          .builder,
      }),
      epub,
      seen.report,
    );

    expect(seen.titles).toEqual(['キノの旅 the Beautiful World']);
  });

  it('reads Korean from a hangul title, so the reader does not have to say so', async () => {
    const builder = fakeBuilder(built(builtSource({ suggestedTitle: '나 혼자만 레벨업' }))).builder;

    const result = await openFile(deps({ builder }), files);

    expect(openedBook(result).language).toBe('ko');
  });

  it('falls back to Japanese when the title says nothing', async () => {
    const builder = fakeBuilder(built(builtSource({ suggestedTitle: 'One Piece v01' }))).builder;

    const result = await openFile(deps({ builder }), files);

    expect(openedBook(result).language).toBe('ja');
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

  const BUILD_FAILURES: readonly SourceBuild[] = [{ kind: 'nothing-usable' }, { kind: 'empty' }];

  it.each(BUILD_FAILURES)(
    'reports a builder failure as a source error and stores nothing: $kind',
    async (failure) => {
      const repository = fakeRepository();
      const builder = fakeBuilder(failure);
      const result = await openFile(
        deps({ repository: repository.repository, builder: builder.builder }),
        files,
      );
      expect(result).toEqual({ kind: 'source', failure });
      expect(repository.added).toEqual([]);
    },
  );

  it('passes a blocked store through when the book will not store', async () => {
    const repository = fakeRepository(STORAGE_UNAVAILABLE);
    const result = await openFile(deps({ repository: repository.repository }), files);
    expect(result).toEqual(STORAGE_UNAVAILABLE);
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

  it('reports the bytes the repository wrote as a storing stage carrying the image count, timed from the clock after the book time', async () => {
    const seen = collector();
    const repository = fakeRepository(WRITTEN, [
      [0, 400],
      [200, 400],
      [400, 400],
    ]);
    const result = await openFile(
      deps({ repository: repository.repository, now: clock([NOW, 1000, 1500, 3000, 5000]) }),
      files,
      seen.report,
    );
    expect(openedBook(result).addedAt).toBe(NOW);
    expect(seen.stages).toEqual([
      { kind: 'storing', imageCount: 182, writtenBytes: 0, totalBytes: 400, elapsedMs: 500 },
      { kind: 'storing', imageCount: 182, writtenBytes: 200, totalBytes: 400, elapsedMs: 2000 },
      { kind: 'storing', imageCount: 182, writtenBytes: 400, totalBytes: 400, elapsedMs: 4000 },
    ]);
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

    expect(result).toEqual({ kind: 'already-held', book: known, merge: NOTHING_TO_MERGE });
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

  const NAMES: readonly (readonly [string, readonly File[], string])[] = [
    ['the uploaded file name', files, 'Yotsuba&! 1.cbz'],
    ['the folder name of a book made from a folder', folder, 'Ch 12'],
  ];

  it.each(NAMES)('stores %s on the new book', async (_case, upload, name) => {
    const repository = fakeRepository();

    const result = await openFile(deps({ repository: repository.repository }), upload);

    expect(openedBook(result).fileName).toBe(name);
    expect(at(repository.added, 0).book.fileName).toBe(name);
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

    expect(result).toEqual({ kind: 'already-held', book: known, merge: NOTHING_TO_MERGE });
    expect(builder.calls).toEqual([]);
  });

  it('restores a removed book under its old id when the fingerprint matches its record', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([]), [
      removedRecord({ contentHash: DIGEST, fileName: 'renamed.cbz' }),
    ]);

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(result.kind).toBe('restored');
    expect(openedBook(result).id).toBe('gone-1');
    expect(at(repository.added, 0).book.id).toBe('gone-1');
  });

  it('restores a removed book with the alias its record kept and the title of the upload', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([]), [
      removedRecord({ contentHash: DIGEST, title: 'Yotsuba&! 1', alias: 'Mine' }),
    ]);
    const builder = fakeBuilder(built(builtSource({ suggestedTitle: 'Nichijou 3' })));

    const result = await openFile(
      deps({ repository: repository.repository, builder: builder.builder }),
      files,
    );

    expect(openedBook(result)).toMatchObject({ title: 'Nichijou 3', alias: 'Mine' });
    expect(at(repository.added, 0).book).toMatchObject({ title: 'Nichijou 3', alias: 'Mine' });
  });

  it('adds a new book with no alias', async () => {
    const result = await openFile(deps(), files);

    expect(openedBook(result).alias).toBeNull();
  });

  it('restores by file name a record whose hash is no partial MD5 digest', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([]), [
      removedRecord({ contentHash: '', fileName: 'Yotsuba&! 1.cbz' }),
    ]);

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(result.kind).toBe('restored');
    expect(openedBook(result).id).toBe('gone-1');
  });

  it('restores by file name a record with another partial MD5 digest and the same file name', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([]), [
      removedRecord({ contentHash: OTHER_DIGEST, fileName: 'Yotsuba&! 1.cbz', title: 'Other' }),
    ]);

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(result.kind).toBe('restored');
    expect(openedBook(result).id).toBe('gone-1');
  });

  it('repairs under its old id an unreadable row with a SHA-256 hash and no file name whose title matches', async () => {
    const repository = fakeRepository(
      WRITTEN,
      [],
      listing([]),
      [],
      [
        removedRecord({
          id: bookId('a816bb74-old'),
          title: 'キノの旅 the Beautiful World',
          contentHash: 'a'.repeat(64),
          fileName: '',
        }),
      ],
    );
    const builder = fakeBuilder(
      built(builtSource({ sourceKind: 'epub', suggestedTitle: 'キノの旅 the Beautiful World' })),
    );

    const result = await openFile(
      deps({ repository: repository.repository, builder: builder.builder }),
      files,
    );

    expect(result.kind).toBe('restored');
    expect(at(repository.added, 0).book.id).toBe('a816bb74-old');
  });

  it('restores an EPUB into a row stored under its file-name title before titles came from metadata', async () => {
    const repository = fakeRepository(
      WRITTEN,
      [],
      listing([]),
      [],
      [removedRecord({ title: 'kino-v1', contentHash: 'a'.repeat(64), fileName: '' })],
    );

    const result = await openFile(
      deps({
        repository: repository.repository,
        inspectEpub: fakeInspector(
          inspectedEpub('pre-paginated', 'rtl', 'ja', 'キノの旅 the Beautiful World'),
        ).inspector,
        builder: fakeBuilder(built(builtSource({ sourceKind: 'epub', suggestedTitle: 'kino-v1' })))
          .builder,
      }),
      epub,
    );

    expect(result.kind).toBe('restored');
    expect(openedBook(result)).toMatchObject({
      id: 'gone-1',
      title: 'キノの旅 the Beautiful World',
    });
  });

  it('restores an EPUB into a row titled by its metadata when the file was renamed', async () => {
    const repository = fakeRepository(
      WRITTEN,
      [],
      listing([]),
      [],
      [
        removedRecord({
          title: 'キノの旅 the Beautiful World',
          contentHash: 'a'.repeat(64),
          fileName: 'kino-v1.epub',
        }),
      ],
    );

    const result = await openFile(
      deps({
        repository: repository.repository,
        inspectEpub: fakeInspector(
          inspectedEpub('pre-paginated', 'rtl', 'ja', 'キノの旅 the Beautiful World'),
        ).inspector,
        builder: fakeBuilder(built(builtSource({ sourceKind: 'epub', suggestedTitle: 'renamed' })))
          .builder,
      }),
      epub,
    );

    expect(result.kind).toBe('restored');
    expect(openedBook(result).id).toBe('gone-1');
  });

  it.each([
    ['its file-name title', 'scan_0042'],
    ['its metadata title', 'よつばと! 1'],
  ])('restores a PDF into a row stored under %s', async (_, storedTitle) => {
    const repository = fakeRepository(
      WRITTEN,
      [],
      listing([]),
      [],
      [removedRecord({ title: storedTitle, contentHash: 'a'.repeat(64), fileName: '' })],
    );

    const result = await openFile(
      deps({
        repository: repository.repository,
        builder: fakeBuilder(
          built(
            builtSource({
              sourceKind: 'pdf',
              suggestedTitle: 'scan_0042',
              metadataTitle: 'よつばと! 1',
            }),
          ),
        ).builder,
      }),
      pdf,
    );

    expect(result.kind).toBe('restored');
    expect(openedBook(result)).toMatchObject({ id: 'gone-1', title: 'よつばと! 1' });
  });

  it('adds a new book when no record shares its hash, file name or title', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([]), [
      removedRecord({ contentHash: OTHER_DIGEST, fileName: 'other.cbz', title: 'Other' }),
    ]);

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(result.kind).toBe('added');
    expect(openedBook(result).id).toBe(NEW_ID);
  });

  it('restores by file name a record with another partial MD5 digest when matching by file name', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([]), [
      removedRecord({ contentHash: OTHER_DIGEST, fileName: 'Yotsuba&! 1.cbz' }),
    ]);

    const result = await openFile(
      deps({ repository: repository.repository }),
      files,
      () => undefined,
      'file-name',
    );

    expect(result.kind).toBe('restored');
    expect(openedBook(result).id).toBe('gone-1');
  });

  it('answers already-held for a held book before it looks at a removed record', async () => {
    const known = heldBook(contentHash(DIGEST));
    const repository = fakeRepository(WRITTEN, [], listing([known]), [
      removedRecord({ contentHash: DIGEST }),
    ]);

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(result).toEqual({ kind: 'already-held', book: known, merge: NOTHING_TO_MERGE });
  });

  const KINO = 'キノの旅 the Beautiful World';

  const kinoUpload: readonly File[] = [inFolder(new File(['bytes'], `${KINO}.epub`), '')];

  function heldKino(): Book {
    return {
      ...heldBook(contentHash(DIGEST)),
      id: bookId('6a7bd926-held'),
      title: KINO,
      sourceKind: 'epub',
      fileName: `${KINO}.epub`,
    };
  }

  function brokenKino(overrides: Partial<RemovedBook> = {}): RemovedBook {
    return removedRecord({
      id: bookId('a816bb74-9c83-4e11-a8bf-ce63119b9e24'),
      title: KINO,
      contentHash: 'a'.repeat(64),
      fileName: '',
      ...overrides,
    });
  }

  it('merges an unreadable SHA-256 row with no file name and the same title into the held book the upload joins', async () => {
    const known = heldKino();
    const repository = fakeRepository(WRITTEN, [], listing([known]), [], [brokenKino()]);
    const builder = fakeBuilder(built(builtSource()));
    const merging = fakeMerge();

    const result = await openFile(
      deps({
        repository: repository.repository,
        builder: builder.builder,
        mergeInto: merging.mergeInto,
      }),
      kinoUpload,
    );

    expect(result).toEqual({ kind: 'already-held', book: known, merge: { kind: 'merged' } });
    expect(merging.calls).toEqual([
      { into: '6a7bd926-held', strays: ['a816bb74-9c83-4e11-a8bf-ce63119b9e24'] },
    ]);
    expect(repository.added).toEqual([]);
    expect(builder.calls).toEqual([]);
  });

  it.each([
    ['its content hash', { title: 'Other', contentHash: DIGEST }],
    ['its file name', { title: 'Other', fileName: `${KINO}.epub` }],
    ['the file-name title of the upload', { title: KINO }],
  ])('merges an unreadable row into a held book by %s', async (_, row) => {
    const known = { ...heldKino(), title: 'Kino no Tabi' };
    const repository = fakeRepository(WRITTEN, [], listing([known]), [], [brokenKino(row)]);
    const merging = fakeMerge();

    const result = await openFile(
      deps({ repository: repository.repository, mergeInto: merging.mergeInto }),
      kinoUpload,
    );

    expect(result).toMatchObject({ kind: 'already-held', merge: { kind: 'merged' } });
    expect(merging.calls).toHaveLength(1);
  });

  it('merges every unreadable row that matches the held book', async () => {
    const repository = fakeRepository(
      WRITTEN,
      [],
      listing([heldKino()]),
      [],
      [brokenKino({ id: bookId('broken-1') }), brokenKino({ id: bookId('broken-2') })],
    );
    const merging = fakeMerge();

    await openFile(
      deps({ repository: repository.repository, mergeInto: merging.mergeInto }),
      kinoUpload,
    );

    expect(merging.calls).toEqual([{ into: '6a7bd926-held', strays: ['broken-1', 'broken-2'] }]);
  });

  it('merges nothing when no unreadable row shares the hash, file name or title of the held book', async () => {
    const known = heldKino();
    const repository = fakeRepository(
      WRITTEN,
      [],
      listing([known]),
      [],
      [brokenKino({ title: 'Other', fileName: 'other.epub' })],
    );
    const merging = fakeMerge();

    const result = await openFile(
      deps({ repository: repository.repository, mergeInto: merging.mergeInto }),
      kinoUpload,
    );

    expect(result).toEqual({ kind: 'already-held', book: known, merge: NOTHING_TO_MERGE });
    expect(merging.calls).toEqual([]);
  });

  it('merges no removed record into a held book, however it matches', async () => {
    const repository = fakeRepository(
      WRITTEN,
      [],
      listing([heldKino()]),
      [brokenKino({ contentHash: DIGEST })],
      [],
    );
    const merging = fakeMerge();

    const result = await openFile(
      deps({ repository: repository.repository, mergeInto: merging.mergeInto }),
      kinoUpload,
    );

    expect(result).toMatchObject({ kind: 'already-held', merge: NOTHING_TO_MERGE });
    expect(merging.calls).toEqual([]);
  });

  it('carries a partial merge out to its caller', async () => {
    const repository = fakeRepository(WRITTEN, [], listing([heldKino()]), [], [brokenKino()]);

    const result = await openFile(
      deps({
        repository: repository.repository,
        mergeInto: fakeMerge({ kind: 'partly-merged' }).mergeInto,
      }),
      kinoUpload,
    );

    expect(result).toMatchObject({ kind: 'already-held', merge: { kind: 'partly-merged' } });
  });

  it('passes a blocked store through when the library cannot be read', async () => {
    const repository = fakeRepository(WRITTEN, [], STORAGE_UNAVAILABLE);

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(result).toEqual(STORAGE_UNAVAILABLE);
  });

  it('inspects an uploaded fixed-layout EPUB before it builds a source from it, and imports it', async () => {
    const order: string[] = [];
    const repository = fakeRepository();
    const inspector = fakeInspector(inspectedEpub('pre-paginated'));
    const builder = fakeBuilder(built(builtSource({ sourceKind: 'epub' })));

    const result = await openFile(
      deps({
        repository: repository.repository,
        inspectEpub: (source) => {
          order.push('inspect');
          return inspector.inspector(source);
        },
        builder: {
          build: (upload, report) => {
            order.push('build');
            return builder.builder.build(upload, report);
          },
        },
      }),
      epub,
    );

    expect(order).toEqual(['inspect', 'build']);
    expect(inspector.inspected).toEqual([at(epub, 0)]);
    expect(openedBook(result).sourceKind).toBe('epub');
    expect(repository.added).toHaveLength(1);
  });

  const DECLARED_LANGUAGES: readonly (readonly [string, string, string])[] = [
    ['ko-KR', 'Yotsuba&! 1', 'ko'],
    ['en-GB', 'Watchmen', 'en'],
  ];

  it.each(DECLARED_LANGUAGES)(
    'takes the language the EPUB itself declares, not one guessed from a title: %s titled %s',
    async (declared, title, language) => {
      const result = await openFile(
        deps({
          inspectEpub: fakeInspector(inspectedEpub('pre-paginated', 'rtl', declared)).inspector,
          builder: fakeBuilder(built(builtSource({ sourceKind: 'epub', suggestedTitle: title })))
            .builder,
        }),
        epub,
      );

      expect(openedBook(result).language).toBe(language);
    },
  );

  it('falls back to the title when the EPUB declares a language this app cannot read', async () => {
    const result = await openFile(
      deps({
        inspectEpub: fakeInspector(
          inspectedEpub('pre-paginated', 'rtl', 'zh-Hans', '\uB098 \uD63C\uC790\uB9CC'),
        ).inspector,
        builder: fakeBuilder(built(builtSource({ sourceKind: 'epub' }))).builder,
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

  const FLOW_COVERS: readonly (readonly [string, Blob | null])[] = [
    ['the cover the builder lifted', COVER],
    ['no cover when its EPUB names none', null],
  ];

  it.each(FLOW_COVERS)(
    'stores a flow book with no images, a place in its text, the order its EPUB gives it, the pairing and fit it never reads, and %s',
    async (_case, cover) => {
      const repository = fakeRepository();
      const builder = fakeBuilder(
        built(builtFlow({ kind: 'no-image', path: 'OEBPS/ch01.xhtml' }, cover)),
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
      expect(at(repository.added, 0).cover).toBe(cover);
      expect(at(repository.added, 0).order).toEqual({ kind: 'intrinsic' });
      expect(openedBook(result).pagePairing).toBe(DEFAULT_PAGE_PAIRING);
      expect(openedBook(result).pageFit).toBe(defaultPageFit('flow'));
    },
  );

  it('stores an EPUB declaring reflowable whose every page is one image as a paged book', async () => {
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
