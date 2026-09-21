import { describe, expect, it } from 'vitest';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from '../domain/book/book';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import type { BuiltSource, SourceBuildError, SourceBuilder } from '../domain/ingest/source-builder';
import type { UploadReport, UploadStage } from '../domain/ingest/upload-progress';
import { openFile } from './open-file';
import type { OpenFileDeps } from './open-file';

const NOW = 1758240000000;

const NEW_ID = 'book-7';

function notFound(id: BookId): Result<never, LibraryError> {
  return err({ kind: 'not-found', id });
}

function builtSource(overrides: Partial<BuiltSource> = {}): BuiltSource {
  return {
    blob: new Blob(['source bytes']),
    sourceKind: 'archive',
    imageCount: 182,
    cover: new Blob(['cover bytes']),
    suggestedTitle: 'Yotsuba&! 1',
    ...overrides,
  };
}

type AddCall = { readonly book: Book; readonly source: Blob; readonly cover: Blob };

function fakeRepository(
  outcome: Result<void, LibraryError> = ok(undefined),
  writes: readonly (readonly [number, number])[] = [],
) {
  const added: AddCall[] = [];
  const repository: LibraryRepository = {
    list: () => Promise.resolve(ok([])),
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

function deps(over: Partial<OpenFileDeps> = {}): OpenFileDeps {
  return {
    repository: fakeRepository().repository,
    builder: fakeBuilder(ok(builtSource())).builder,
    requestPersistence: () => Promise.resolve(true),
    now: () => NOW,
    newId: () => NEW_ID,
    ...over,
  };
}

const files: readonly File[] = [new File(['bytes'], 'Yotsuba&! 1.cbz')];

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
    expect(at(repository.added, 0).cover).toBe(built.cover);
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
    expect(result.ok && result.value.position).toBe(0);
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
    const builder = fakeBuilder(ok(builtSource({ sourceKind: 'pdf', imageCount: 7 })));
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

  it('leaves the reading position typed as an image index', async () => {
    const result = await openFile(deps(), files);
    const position: ImageIndex | undefined = result.ok ? result.value.position : undefined;
    expect(position).toBe(0);
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

  it('reports nothing when no reporter is given', async () => {
    const repository = fakeRepository(ok(undefined), [[1, 2]]);
    const result = await openFile(deps({ repository: repository.repository }), files);
    expect(result.ok).toBe(true);
  });
});
