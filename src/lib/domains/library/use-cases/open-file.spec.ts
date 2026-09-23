import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId, ContentHash } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from '../domain/book/book';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import { NO_CONTENT_HASH } from '../domain/book/stored-book';
import type { EpubInspection, EpubInspectionError } from '../domain/ingest/epub-inspection';
import type { EpubInspector } from '../domain/ingest/epub-inspector';
import type { EpubLayout, EpubPackage, SpineDirection } from '../domain/ingest/epub-package';
import type { PageObstacle } from '../domain/ingest/epub-pages';
import type { BookProtection } from '../domain/ingest/epub-protection';
import type {
  BuiltPages,
  BuiltSource,
  SourceBuildError,
  SourceBuilder,
} from '../domain/ingest/source-builder';
import { uploadManifest } from '../domain/ingest/upload-manifest';
import type { UploadReport, UploadStage } from '../domain/ingest/upload-progress';
import { openFile } from './open-file';
import type { OpenFileDeps } from './open-file';

const NOW = 1758240000000;

const NEW_ID = 'book-7';

const DIGEST = 'f0e1d2c3';

const NOT_AN_EPUB: EpubInspection = { kind: 'not-an-epub' };

function notFound(id: BookId): Result<never, LibraryError> {
  return err({ kind: 'not-found', id });
}

type BuiltImages = Extract<BuiltPages, { readonly kind: 'images' }>;

const COVER = new Blob(['cover bytes']);

function builtImages(overrides: Partial<BuiltImages> = {}): BuiltImages {
  return { kind: 'images', imageCount: 182, cover: COVER, ...overrides };
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

type AddCall = { readonly book: Book; readonly source: Blob; readonly cover: Blob | null };

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
    imageCount: 182,
    addedAt: 1758240000000,
    position: imagePlace(imageIndex(9)),
  };
}

function fakeRepository(
  outcome: Result<void, LibraryError> = ok(undefined),
  writes: readonly (readonly [number, number])[] = [],
  held: Result<readonly Book[], LibraryError> = ok([]),
) {
  const added: AddCall[] = [];
  const repository: LibraryRepository = {
    list: () => Promise.resolve(held),
    get: (id) => Promise.resolve(notFound(id)),
    add: (book, source, cover, report) => {
      added.push({ book, source, cover });
      for (const [written, total] of writes) report(written, total);
      return Promise.resolve(outcome);
    },
    remove: () => Promise.resolve(ok(undefined)),
    update: (id) => Promise.resolve(notFound(id)),
    readSource: (id) => Promise.resolve(notFound(id)),
    readCover: (id) => Promise.resolve(notFound(id)),
    storedBytes: () => Promise.resolve(ok(0)),
  };
  return { repository, added };
}

function fakeBuilder(
  outcome: Result<BuiltSource, SourceBuildError>,
  stages: readonly UploadStage[] = [],
) {
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

function fakeInspector(outcome: Result<EpubInspection, EpubInspectionError> = ok(NOT_AN_EPUB)): {
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
): Result<EpubInspection, EpubInspectionError> {
  return ok({
    kind: 'epub',
    packagePath: 'OEBPS/content.opf',
    packageDocument: epubPackage(layout, direction, language),
  });
}

function deps(over: Partial<OpenFileDeps> = {}): OpenFileDeps {
  return {
    repository: fakeRepository().repository,
    builder: fakeBuilder(ok(builtSource())).builder,
    inspectEpub: fakeInspector().inspector,
    fingerprint: () => Promise.resolve(DIGEST),
    requestPersistence: () => Promise.resolve(true),
    now: () => NOW,
    newId: () => NEW_ID,
    ...over,
  };
}

function fakeFingerprint(digest: string = DIGEST) {
  const hashed: Blob[] = [];
  return {
    hashed,
    fingerprint: (blob: Blob) => {
      hashed.push(blob);
      return Promise.resolve(digest);
    },
  };
}

const files: readonly File[] = [new File(['bytes'], 'Yotsuba&! 1.cbz')];

const epub: readonly File[] = [new File(['bytes'], 'Yotsuba&! 1.epub')];

const folder: readonly File[] = [
  new File(['0123456789'], '002.png'),
  new File(['01234'], '001.png'),
];

describe('openFile', () => {
  it('returns the stored book on the happy path', async () => {
    const repository = fakeRepository();
    const result = await openFile(deps({ repository: repository.repository }), files);
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.title).toBe('Yotsuba&! 1');
  });

  it('stores exactly the book it returns', async () => {
    const repository = fakeRepository();
    const result = await openFile(deps({ repository: repository.repository }), files);
    expect(repository.added).toHaveLength(1);
    expect(result.ok && result.value).toEqual(at(repository.added, 0).book);
  });

  it('stores the source blob and the cover the builder produced', async () => {
    const built = builtSource();
    const repository = fakeRepository();
    const builder = fakeBuilder(ok(built));
    await openFile(deps({ repository: repository.repository, builder: builder.builder }), files);
    expect(at(repository.added, 0).source).toBe(built.blob);
    expect(at(repository.added, 0).cover).toBe(COVER);
  });

  it('uses the injected id, time and title', async () => {
    const builder = fakeBuilder(ok(builtSource({ suggestedTitle: 'Nichijou 3' })));
    const result = await openFile(
      deps({ builder: builder.builder, now: () => 42, newId: () => 'b-99' }),
      files,
    );
    expect(result.ok && result.value.id).toBe('b-99');
    expect(result.ok && result.value.addedAt).toBe(42);
    expect(result.ok && result.value.title).toBe('Nichijou 3');
  });

  it('defaults a new book to Japanese, paged, right to left, two pages after a cover, at the first image', async () => {
    const result = await openFile(deps(), files);
    expect(result.ok && result.value.language).toBe('ja');
    expect(result.ok && result.value.layoutKind).toBe('paged');
    expect(result.ok && result.value.direction).toBe('rtl');
    expect(result.ok && result.value.pagePairing).toBe(DEFAULT_PAGE_PAIRING);
    expect(result.ok && result.value.position).toEqual({ kind: 'image', index: 0 });
  });

  it('reads Korean from a hangul title, so the reader does not have to say so', async () => {
    const builder = fakeBuilder(ok(builtSource({ suggestedTitle: '나 혼자만 레벨업' }))).builder;

    const result = await openFile(deps({ builder }), files);

    expect(result.ok && result.value.language).toBe('ko');
  });

  it('reads Japanese from a kana title', async () => {
    const builder = fakeBuilder(ok(builtSource({ suggestedTitle: 'よつばと！' }))).builder;

    const result = await openFile(deps({ builder }), files);

    expect(result.ok && result.value.language).toBe('ja');
  });

  it('falls back to Japanese when the title says nothing', async () => {
    const builder = fakeBuilder(ok(builtSource({ suggestedTitle: 'One Piece v01' }))).builder;

    const result = await openFile(deps({ builder }), files);

    expect(result.ok && result.value.language).toBe('ja');
  });

  it('defaults a new book to the fit its layout kind asks for', async () => {
    const result = await openFile(deps(), files);
    expect(result.ok && result.value.pageFit).toBe(defaultPageFit('paged'));
  });

  it('carries the source kind and the image count the builder reported', async () => {
    const builder = fakeBuilder(
      ok(builtSource({ sourceKind: 'pdf', pages: builtImages({ imageCount: 7 }) })),
    );
    const result = await openFile(deps({ builder: builder.builder }), files);
    expect(result.ok && result.value.sourceKind).toBe('pdf');
    expect(result.ok && result.value.imageCount).toBe(7);
  });

  it('hands the builder the files it was given', async () => {
    const builder = fakeBuilder(ok(builtSource()));
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
        return Promise.resolve(ok(builtSource()));
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
    expect(result.ok).toBe(true);
    expect(repository.added).toHaveLength(1);
  });

  it('reports a builder failure as a source error', async () => {
    const builder = fakeBuilder(err<SourceBuildError>({ kind: 'nothing-usable' }));
    const result = await openFile(deps({ builder: builder.builder }), files);
    expect(result).toEqual({
      ok: false,
      error: { kind: 'source', error: { kind: 'nothing-usable' } },
    });
  });

  it('stores nothing when the builder fails', async () => {
    const repository = fakeRepository();
    const builder = fakeBuilder(err<SourceBuildError>({ kind: 'empty' }));
    await openFile(deps({ repository: repository.repository, builder: builder.builder }), files);
    expect(repository.added).toEqual([]);
  });

  it('reports a repository failure as a storage error', async () => {
    const repository = fakeRepository(
      err<LibraryError>({ kind: 'storage-failed', cause: 'the quota is exhausted' }),
    );
    const result = await openFile(deps({ repository: repository.repository }), files);
    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'storage',
        error: { kind: 'storage-failed', cause: 'the quota is exhausted' },
      },
    });
  });

  it('leaves the reading position typed as a reading place', async () => {
    const result = await openFile(deps(), files);
    const position: ReadingPlace | undefined = result.ok ? result.value.position : undefined;
    expect(position).toEqual({ kind: 'image', index: 0 });
  });

  it('forwards every stage the builder reported', async () => {
    const seen = collector();
    const builder = fakeBuilder(ok(builtSource()), [
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
    const repository = fakeRepository(ok(undefined), [
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
    const repository = fakeRepository(ok(undefined), [[64, 128]]);
    const result = await openFile(
      deps({ repository: repository.repository, now: clock([7, 100, 900]) }),
      files,
      seen.report,
    );
    expect(result.ok && result.value.addedAt).toBe(7);
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

    await openFile(deps({ fingerprint: hashing.fingerprint }), files);

    expect(hashing.hashed).toEqual([at(files, 0)]);
  });

  it('fingerprints the sorted names and sizes of a folder of images', async () => {
    const hashing = fakeFingerprint();

    await openFile(deps({ fingerprint: hashing.fingerprint }), folder);

    expect(await at(hashing.hashed, 0).text()).toBe(uploadManifest(folder));
  });

  it('reads the same manifest whichever order a folder arrives in', async () => {
    const one = fakeFingerprint();
    const other = fakeFingerprint();

    await openFile(deps({ fingerprint: one.fingerprint }), folder);
    await openFile(deps({ fingerprint: other.fingerprint }), folder.toReversed());

    expect(await at(one.hashed, 0).text()).toBe(await at(other.hashed, 0).text());
  });

  it('stores the fingerprint on the new book', async () => {
    const repository = fakeRepository();

    const result = await openFile(
      deps({ repository: repository.repository, fingerprint: () => Promise.resolve('beef01') }),
      files,
    );

    expect(result.ok && result.value.contentHash).toBe('beef01');
    expect(at(repository.added, 0).book.contentHash).toBe('beef01');
  });

  it('returns the book it already holds when the fingerprint matches', async () => {
    const known = heldBook(contentHash(DIGEST));
    const repository = fakeRepository(ok(undefined), [], ok([known]));

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(result).toEqual(ok(known));
  });

  it('stores nothing and builds nothing when the fingerprint matches', async () => {
    const repository = fakeRepository(ok(undefined), [], ok([heldBook(contentHash(DIGEST))]));
    const builder = fakeBuilder(ok(builtSource()));

    await openFile(deps({ repository: repository.repository, builder: builder.builder }), files);

    expect(repository.added).toEqual([]);
    expect(builder.calls).toEqual([]);
  });

  it('imports a file no held book carries the fingerprint of', async () => {
    const repository = fakeRepository(ok(undefined), [], ok([heldBook(contentHash('other'))]));

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(repository.added).toHaveLength(1);
    expect(result.ok && result.value.id).toBe(NEW_ID);
  });

  it('imports a file although a book stored before fingerprints carries none', async () => {
    const repository = fakeRepository(ok(undefined), [], ok([heldBook(NO_CONTENT_HASH)]));

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(repository.added).toHaveLength(1);
    expect(result.ok && result.value.id).toBe(NEW_ID);
  });

  it('reports a failure to read the library as a storage error', async () => {
    const repository = fakeRepository(
      ok(undefined),
      [],
      err<LibraryError>({ kind: 'storage-unavailable' }),
    );

    const result = await openFile(deps({ repository: repository.repository }), files);

    expect(result).toEqual({
      ok: false,
      error: { kind: 'storage', error: { kind: 'storage-unavailable' } },
    });
  });

  it('inspects an uploaded EPUB before it builds a source from it', async () => {
    const inspector = fakeInspector(inspectedEpub('pre-paginated'));
    const builder = fakeBuilder(ok(builtSource({ sourceKind: 'epub' })));

    const result = await openFile(
      deps({ inspectEpub: inspector.inspector, builder: builder.builder }),
      epub,
    );

    expect(inspector.inspected).toEqual([at(epub, 0)]);
    expect(result.ok).toBe(true);
  });

  it('takes the language the EPUB itself declares, not one guessed from a title', async () => {
    const result = await openFile(
      deps({
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated', 'rtl', 'ko-KR')).inspector,
        builder: fakeBuilder(ok(builtSource({ sourceKind: 'epub' }))).builder,
      }),
      epub,
    );

    expect(result.ok && result.value.language).toBe('ko');
  });

  it('opens an EPUB declaring English as English, whatever its Latin title looks like', async () => {
    const result = await openFile(
      deps({
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated', 'rtl', 'en-GB')).inspector,
        builder: fakeBuilder(ok(builtSource({ sourceKind: 'epub', suggestedTitle: 'Watchmen' })))
          .builder,
      }),
      epub,
    );

    expect(result.ok && result.value.language).toBe('en');
  });

  it('falls back to the title when the EPUB declares a language this app cannot read', async () => {
    const result = await openFile(
      deps({
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated', 'rtl', 'zh-Hans')).inspector,
        builder: fakeBuilder(
          ok(builtSource({ sourceKind: 'epub', suggestedTitle: '\uB098 \uD63C\uC790\uB9CC' })),
        ).builder,
      }),
      epub,
    );

    expect(result.ok && result.value.language).toBe('ko');
  });

  it('takes the reading direction the EPUB itself declares', async () => {
    const repository = fakeRepository();

    const result = await openFile(
      deps({
        repository: repository.repository,
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated', 'ltr')).inspector,
        builder: fakeBuilder(ok(builtSource({ sourceKind: 'epub' }))).builder,
      }),
      epub,
    );

    expect(result.ok && result.value.direction).toBe('ltr');
  });

  it('reads an EPUB that declares no direction left to right, as the format says', async () => {
    const result = await openFile(
      deps({
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated', 'default')).inspector,
        builder: fakeBuilder(ok(builtSource({ sourceKind: 'epub' }))).builder,
      }),
      epub,
    );

    expect(result.ok && result.value.direction).toBe('ltr');
  });

  it('keeps the manga default for an upload that is no EPUB at all', async () => {
    const result = await openFile(deps(), files);

    expect(result.ok && result.value.direction).toBe('rtl');
  });

  it('imports a fixed-layout EPUB', async () => {
    const repository = fakeRepository();
    const result = await openFile(
      deps({
        repository: repository.repository,
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated')).inspector,
        builder: fakeBuilder(ok(builtSource({ sourceKind: 'epub' }))).builder,
      }),
      epub,
    );

    expect(result.ok && result.value.sourceKind).toBe('epub');
    expect(repository.added).toHaveLength(1);
  });

  it('stores an EPUB declaring reflowable whose every page is one image', async () => {
    const repository = fakeRepository();
    const builder = fakeBuilder(ok(builtSource({ sourceKind: 'epub' })));

    const result = await openFile(
      deps({
        repository: repository.repository,
        builder: builder.builder,
        inspectEpub: fakeInspector(inspectedEpub('reflowable')).inspector,
      }),
      epub,
    );

    expect(builder.calls).toEqual([epub]);
    expect(result.ok && result.value.sourceKind).toBe('epub');
    expect(repository.added).toHaveLength(1);
  });

  it('imports an EPUB declaring reflowable whose pages are not images as a flow book', async () => {
    const repository = fakeRepository();
    const obstacle: PageObstacle = { kind: 'no-image', path: 'OEBPS/ch01.xhtml' };
    const builder = fakeBuilder(ok(builtFlow(obstacle)));

    const result = await openFile(
      deps({
        repository: repository.repository,
        builder: builder.builder,
        inspectEpub: fakeInspector(inspectedEpub('reflowable')).inspector,
      }),
      epub,
    );

    expect(result.ok && result.value.layoutKind).toBe('flow');
    expect(result.ok && result.value.sourceKind).toBe('epub');
    expect(repository.added).toHaveLength(1);
  });

  it('stores a flow book with no images, a place in its text and the cover the builder lifted', async () => {
    const repository = fakeRepository();
    const builder = fakeBuilder(
      ok(builtFlow({ kind: 'no-image', path: 'OEBPS/ch01.xhtml' }, COVER)),
    );

    const result = await openFile(
      deps({
        repository: repository.repository,
        builder: builder.builder,
        inspectEpub: fakeInspector(inspectedEpub('reflowable')).inspector,
      }),
      epub,
    );

    expect(result.ok && result.value.imageCount).toBe(0);
    expect(result.ok && result.value.position).toEqual({
      kind: 'text',
      cfi: '',
      fraction: null,
    });
    expect(at(repository.added, 0).cover).toBe(COVER);
  });

  it('stores a flow book whose EPUB names no cover with none', async () => {
    const repository = fakeRepository();
    const builder = fakeBuilder(ok(builtFlow({ kind: 'no-image', path: 'OEBPS/ch01.xhtml' })));

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
    const builder = fakeBuilder(ok(builtFlow({ kind: 'no-image', path: 'OEBPS/ch01.xhtml' })));

    const result = await openFile(
      deps({
        builder: builder.builder,
        inspectEpub: fakeInspector(inspectedEpub('reflowable')).inspector,
      }),
      epub,
    );

    expect(result.ok && result.value.pagePairing).toBe(DEFAULT_PAGE_PAIRING);
    expect(result.ok && result.value.pageFit).toBe(defaultPageFit('flow'));
  });

  it('imports an EPUB declaring reflowable whose every page is one image as a paged book', async () => {
    const result = await openFile(
      deps({
        builder: fakeBuilder(ok(builtSource({ sourceKind: 'epub' }))).builder,
        inspectEpub: fakeInspector(inspectedEpub('reflowable')).inspector,
      }),
      epub,
    );

    expect(result.ok && result.value.layoutKind).toBe('paged');
    expect(result.ok && result.value.position).toEqual({ kind: 'image', index: 0 });
  });

  it('carries the protection of a locked EPUB out to its caller', async () => {
    const protection: BookProtection = { kind: 'rights-managed' };
    const inspector = fakeInspector(
      err<EpubInspectionError>({ kind: 'protected', protection }),
    ).inspector;

    const result = await openFile(deps({ inspectEpub: inspector }), epub);

    expect(result).toEqual({
      ok: false,
      error: { kind: 'epub', error: { kind: 'protected', protection } },
    });
  });

  it('refuses an ineligible fixed-layout EPUB with the obstacle the builder named, and stores nothing', async () => {
    const repository = fakeRepository();
    const obstacle: PageObstacle = { kind: 'many-images', path: 'OEBPS/p3.xhtml', count: 2 };
    const builder = fakeBuilder(ok(builtFlow(obstacle)));

    const result = await openFile(
      deps({
        repository: repository.repository,
        builder: builder.builder,
        inspectEpub: fakeInspector(inspectedEpub('pre-paginated')).inspector,
      }),
      epub,
    );

    expect(result).toEqual({ ok: false, error: { kind: 'not-paged', obstacle } });
    expect(repository.added).toEqual([]);
  });

  it('refuses an unpaged upload that is no EPUB at all', async () => {
    const obstacle: PageObstacle = { kind: 'no-image', path: 'OEBPS/ch01.xhtml' };

    const result = await openFile(
      deps({ builder: fakeBuilder(ok(builtFlow(obstacle))).builder }),
      files,
    );

    expect(result).toEqual({ ok: false, error: { kind: 'not-paged', obstacle } });
  });

  it('inspects no EPUB when the upload is an archive', async () => {
    const inspector = fakeInspector();

    await openFile(deps({ inspectEpub: inspector.inspector }), files);

    expect(inspector.inspected).toEqual([]);
  });

  it('builds a source from a .epub the inspection calls no EPUB at all', async () => {
    const builder = fakeBuilder(ok(builtSource({ sourceKind: 'epub' })));

    const result = await openFile(deps({ builder: builder.builder }), epub);

    expect(builder.calls).toEqual([epub]);
    expect(result.ok).toBe(true);
  });

  it('reports nothing when no reporter is given', async () => {
    const repository = fakeRepository(ok(undefined), [[1, 2]]);
    const result = await openFile(deps({ repository: repository.repository }), files);
    expect(result.ok).toBe(true);
  });
});
