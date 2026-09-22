import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { ContentHash } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { LayoutKind } from '$lib/shared/layout-kind';
import { imagePlace } from '$lib/shared/reading-place';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from '../domain/book/book';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import type { SourceBuildError, SourceBuilder } from '../domain/ingest/source-builder';
import { languageOfTitle } from '../domain/ingest/title-language';
import { uploadManifest } from '../domain/ingest/upload-manifest';
import type { UploadReport } from '../domain/ingest/upload-progress';

type OpenFileError =
  | { readonly kind: 'source'; readonly error: SourceBuildError }
  | { readonly kind: 'storage'; readonly error: LibraryError };

type OpenFileDeps = {
  readonly repository: LibraryRepository;
  readonly builder: SourceBuilder;
  readonly fingerprint: (blob: Blob) => Promise<string>;
  readonly requestPersistence: () => Promise<boolean>;
  readonly now: () => number;
  readonly newId: () => string;
};

const DEFAULT_LANGUAGE: Language = 'ja';

function hashedPart(files: readonly File[]): Blob {
  const [only] = files;
  if (files.length === 1 && only !== undefined) return only;
  return new Blob([uploadManifest(files)]);
}

async function uploadHash(deps: OpenFileDeps, files: readonly File[]): Promise<ContentHash> {
  const digest = await deps.fingerprint(hashedPart(files));
  return contentHash(digest);
}

async function openFile(
  deps: OpenFileDeps,
  files: readonly File[],
  report: UploadReport = () => undefined,
): Promise<Result<Book, OpenFileError>> {
  await deps.requestPersistence();

  const hash = await uploadHash(deps, files);
  const held = await deps.repository.list();
  if (!held.ok) return err({ kind: 'storage', error: held.error });

  const known = held.value.find((book) => book.contentHash === hash);
  if (known !== undefined) return ok(known);

  const built = await deps.builder.build(files, report);
  if (!built.ok) return err({ kind: 'source', error: built.error });

  const layoutKind: LayoutKind = 'paged';

  const title = built.value.suggestedTitle;

  const book: Book = {
    id: bookId(deps.newId()),
    title,
    language: languageOfTitle(title) ?? DEFAULT_LANGUAGE,
    layoutKind,
    direction: 'rtl',
    pagePairing: DEFAULT_PAGE_PAIRING,
    pageFit: defaultPageFit(layoutKind),
    sourceKind: built.value.sourceKind,
    contentHash: hash,
    imageCount: built.value.imageCount,
    addedAt: deps.now(),
    position: imagePlace(imageIndex(0)),
  };

  const startedAt = deps.now();
  const stored = await deps.repository.add(
    book,
    built.value.blob,
    built.value.cover,
    (writtenBytes, totalBytes) => {
      report({
        kind: 'storing',
        imageCount: built.value.imageCount,
        writtenBytes,
        totalBytes,
        elapsedMs: deps.now() - startedAt,
      });
    },
  );
  if (!stored.ok) return err({ kind: 'storage', error: stored.error });

  return ok(book);
}

export { openFile };
export type { OpenFileError, OpenFileDeps };
