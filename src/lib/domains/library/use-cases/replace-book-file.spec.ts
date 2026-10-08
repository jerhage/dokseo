import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex, seriesId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { DEFAULT_PAGE_PAIRING, defaultPageFit } from '../domain/book/book';
import type { Book } from '../domain/book/book';
import type { BookListing, LibraryRepository } from '../domain/book/library-repository';
import type { PageOrder } from '../domain/book/page-list';
import type { ContentDigest } from '../domain/ingest/content-hasher';
import type { EpubInspector } from '../domain/ingest/epub-inspector';
import type { BuiltSource, SourceBuild, SourceBuilder } from '../domain/ingest/source-builder';
import { replaceBookFile } from './replace-book-file';
import type { ReplaceBookFileDeps } from './replace-book-file';

const OLD_DIGEST = 'f0e1d2c3f0e1d2c3f0e1d2c3f0e1d2c3';

const NEW_DIGEST = '0123456789abcdef0123456789abcdef';

const FRESH_DIGEST = 'aaaa456789abcdef0123456789abcdef';

const COVER = new Blob(['new cover']);

const LISTED: PageOrder = { kind: 'listed', names: ['001.jpg', '002.jpg'] };

const HELD: Book = {
  id: bookId('book-1'),
  title: 'My own title',
  alias: 'Mine',
  seriesId: seriesId('series-1'),
  volume: 2,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: DEFAULT_PAGE_PAIRING,
  pageFit: defaultPageFit('paged'),
  sourceKind: 'archive',
  contentHash: contentHash(OLD_DIGEST),
  fileName: 'old.cbz',
  imageCount: 182,
  addedAt: 1758240000000,
  position: imagePlace(imageIndex(150)),
  lastReadAt: 1758250000000,
  finishedAt: null,
};

const OTHER: Book = {
  ...HELD,
  id: bookId('book-2'),
  contentHash: contentHash(NEW_DIGEST),
  fileName: 'other.cbz',
};

type ReplaceCall = {
  readonly book: Book;
  readonly source: Blob;
  readonly cover: Blob | null;
  readonly order: PageOrder;
};

function notUsed(): never {
  throw new Error('not used');
}

function setup(
  options: {
    readonly books?: readonly Book[];
    readonly listing?: BookListing;
    readonly build?: SourceBuild;
    readonly digest?: ContentDigest;
    readonly stored?: Awaited<ReturnType<LibraryRepository['replaceFile']>>;
    readonly pageCount?: number;
  } = {},
) {
  const replaced: ReplaceCall[] = [];
  const builds: (readonly File[])[] = [];
  const source: BuiltSource = {
    blob: new Blob(['new source']),
    sourceKind: 'archive',
    suggestedTitle: 'Yotsuba&! 1',
    metadataTitle: null,
    pages: {
      kind: 'images',
      imageCount: options.pageCount ?? 190,
      cover: COVER,
      order: LISTED,
    },
  };
  const repository: LibraryRepository = {
    list: () =>
      Promise.resolve(
        options.listing ?? {
          kind: 'success',
          books: options.books ?? [HELD, OTHER],
          unreadable: [],
        },
      ),
    get: notUsed,
    add: notUsed,
    replaceFile: (book, blob, cover, order) => {
      replaced.push({ book, source: blob, cover, order });
      return Promise.resolve(options.stored ?? { kind: 'success' });
    },
    readPageList: notUsed,
    savePageList: notUsed,
    remove: notUsed,
    erase: notUsed,
    listRemoved: notUsed,
    listRestorable: notUsed,
    addRemoved: notUsed,
    forgetRemoved: notUsed,
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    storedBytes: notUsed,
  };
  const builder: SourceBuilder = {
    build: (files) => {
      builds.push(files);
      return Promise.resolve(options.build ?? { kind: 'success', source });
    },
  };
  const inspectEpub: EpubInspector = () =>
    Promise.resolve({ kind: 'success', inspection: { kind: 'not-an-epub' } });
  const deps: ReplaceBookFileDeps = {
    repository,
    builder,
    inspectEpub,
    partialMd5: () => Promise.resolve(options.digest ?? { kind: 'success', digest: FRESH_DIGEST }),
  };
  return { deps, replaced, builds, source };
}

function uploaded(name: string): File {
  const file = new File(['bytes'], name);
  Object.defineProperty(file, 'webkitRelativePath', { value: '' });
  return file;
}

const files = [uploaded('new.cbz')];

describe('replaceBookFile', () => {
  it('stores the new file under the same book and keeps the title, alias, series, volume and reading history', async () => {
    const { deps, replaced, source } = setup();

    const result = await replaceBookFile(deps, HELD.id, files);

    expect(result.kind).toBe('replaced');
    expect(replaced).toEqual([
      {
        book: {
          ...HELD,
          contentHash: contentHash(FRESH_DIGEST),
          fileName: 'new.cbz',
          imageCount: 190,
        },
        source: source.blob,
        cover: COVER,
        order: LISTED,
      },
    ]);
    expect(result).toEqual({ kind: 'replaced', book: replaced[0]?.book });
  });

  it('moves a reading place past the new last page back to it', async () => {
    const { deps, replaced } = setup({ pageCount: 100 });

    await replaceBookFile(deps, HELD.id, files);

    expect(replaced[0]?.book.position).toEqual(imagePlace(imageIndex(99)));
  });

  it('reports not-found for a book that is not held, and stores nothing', async () => {
    const { deps, replaced, builds } = setup({ books: [OTHER] });

    const result = await replaceBookFile(deps, HELD.id, files);

    expect(result).toEqual({ kind: 'not-found', id: HELD.id });
    expect(replaced).toEqual([]);
    expect(builds).toEqual([]);
  });

  it('reports same-file when the file has the content hash the book already has, and stores nothing', async () => {
    const { deps, replaced, builds } = setup({ digest: { kind: 'success', digest: OLD_DIGEST } });

    const result = await replaceBookFile(deps, HELD.id, files);

    expect(result).toEqual({ kind: 'same-file', book: HELD });
    expect(replaced).toEqual([]);
    expect(builds).toEqual([]);
  });

  it('reports already-held with the other book when another book has the hash, and stores nothing', async () => {
    const { deps, replaced, builds } = setup({ digest: { kind: 'success', digest: NEW_DIGEST } });

    const result = await replaceBookFile(deps, HELD.id, files);

    expect(result).toEqual({ kind: 'already-held', book: OTHER });
    expect(replaced).toEqual([]);
    expect(builds).toEqual([]);
  });

  it('passes a file that cannot be built on, and stores nothing', async () => {
    const { deps, replaced } = setup({ build: { kind: 'empty' } });

    const result = await replaceBookFile(deps, HELD.id, files);

    expect(result).toEqual({ kind: 'source', failure: { kind: 'empty' } });
    expect(replaced).toEqual([]);
  });

  it('passes a file that cannot be fingerprinted on', async () => {
    const { deps } = setup({ digest: { kind: 'unreadable', cause: 'no bytes' } });

    const result = await replaceBookFile(deps, HELD.id, files);

    expect(result).toEqual({ kind: 'fingerprint', cause: 'no bytes' });
  });

  it('passes unavailable storage on when it cannot list the books', async () => {
    const { deps } = setup({ listing: STORAGE_UNAVAILABLE });

    const result = await replaceBookFile(deps, HELD.id, files);

    expect(result).toEqual(STORAGE_UNAVAILABLE);
  });

  it('passes unavailable storage on when it cannot write the file', async () => {
    const { deps } = setup({ stored: STORAGE_UNAVAILABLE });

    const result = await replaceBookFile(deps, HELD.id, files);

    expect(result).toEqual(STORAGE_UNAVAILABLE);
  });
});
