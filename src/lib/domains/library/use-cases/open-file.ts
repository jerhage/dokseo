import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { ContentHash } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { LayoutKind, ReadingDirection } from '$lib/shared/layout-kind';
import { imagePlace, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from '../domain/book/book';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import type { EpubInspectionError } from '../domain/ingest/epub-inspection';
import type { EpubInspector } from '../domain/ingest/epub-inspector';
import type { PageObstacle } from '../domain/ingest/epub-pages';
import { detectSourceKind } from '../domain/ingest/source-detection';
import type { BuiltPages, SourceBuildError, SourceBuilder } from '../domain/ingest/source-builder';
import { languageDeclared } from '../domain/ingest/declared-language';
import type { EpubPackage } from '../domain/ingest/epub-package';
import { languageOfTitle } from '../domain/ingest/title-language';
import { uploadManifest } from '../domain/ingest/upload-manifest';
import type { UploadReport } from '../domain/ingest/upload-progress';

type OpenFileError =
  | { readonly kind: 'source'; readonly error: SourceBuildError }
  | { readonly kind: 'storage'; readonly error: LibraryError }
  | { readonly kind: 'epub'; readonly error: EpubInspectionError }
  | { readonly kind: 'not-paged'; readonly obstacle: PageObstacle };

type OpenFileDeps = {
  readonly repository: LibraryRepository;
  readonly builder: SourceBuilder;
  readonly inspectEpub: EpubInspector;
  readonly fingerprint: (blob: Blob) => Promise<string>;
  readonly requestPersistence: () => Promise<boolean>;
  readonly now: () => number;
  readonly newId: () => string;
};

const DEFAULT_LANGUAGE: Language = 'ja';

const DEFAULT_DIRECTION: ReadingDirection = 'rtl';

function hashedPart(files: readonly File[]): Blob {
  const [only] = files;
  if (files.length === 1 && only !== undefined) return only;
  return new Blob([uploadManifest(files)]);
}

async function uploadHash(deps: OpenFileDeps, files: readonly File[]): Promise<ContentHash> {
  const digest = await deps.fingerprint(hashedPart(files));
  return contentHash(digest);
}

function epubUpload(files: readonly File[]): File | null {
  const [only] = files;
  if (files.length !== 1 || only === undefined) return null;
  return detectSourceKind([only.name]) === 'epub' ? only : null;
}

type UploadInspection =
  | { readonly kind: 'not-an-epub' }
  | { readonly kind: 'refused'; readonly refusal: EpubInspectionError }
  | { readonly kind: 'epub'; readonly packageDocument: EpubPackage };

const NOT_AN_EPUB: UploadInspection = { kind: 'not-an-epub' };

async function inspectUpload(
  deps: OpenFileDeps,
  files: readonly File[],
): Promise<UploadInspection> {
  const epub = epubUpload(files);
  if (epub === null) return NOT_AN_EPUB;

  const inspected = await deps.inspectEpub(epub);
  if (!inspected.ok) return { kind: 'refused', refusal: inspected.error };
  if (inspected.value.kind === 'not-an-epub') return NOT_AN_EPUB;

  return { kind: 'epub', packageDocument: inspected.value.packageDocument };
}

type BookContent = {
  readonly layoutKind: LayoutKind;
  readonly imageCount: number;
  readonly cover: Blob | null;
  readonly position: ReadingPlace;
};

const NO_IMAGES = 0;

const NO_COVER = null;

const START_OF_A_FLOW_BOOK: ReadingPlace = textPlace('');

const FLOW_CONTENT: BookContent = {
  layoutKind: 'flow',
  imageCount: NO_IMAGES,
  cover: NO_COVER,
  position: START_OF_A_FLOW_BOOK,
};

function declaresReflowing(inspection: UploadInspection): boolean {
  return inspection.kind === 'epub' && inspection.packageDocument.layout === 'reflowable';
}

function contentOf(
  inspection: UploadInspection,
  pages: BuiltPages,
): Result<BookContent, OpenFileError> {
  if (pages.kind === 'images') {
    return ok({
      layoutKind: 'paged',
      imageCount: pages.imageCount,
      cover: pages.cover,
      position: imagePlace(imageIndex(0)),
    });
  }
  if (!declaresReflowing(inspection)) return err({ kind: 'not-paged', obstacle: pages.obstacle });

  return ok(FLOW_CONTENT);
}

function declaredLanguage(inspection: UploadInspection): Language | null {
  if (inspection.kind !== 'epub') return null;

  return languageDeclared(inspection.packageDocument.language);
}

function declaredDirection(inspection: UploadInspection): ReadingDirection {
  if (inspection.kind !== 'epub') return DEFAULT_DIRECTION;
  if (inspection.packageDocument.direction === 'default') return DEFAULT_DIRECTION;

  return inspection.packageDocument.direction;
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

  const inspection = await inspectUpload(deps, files);
  if (inspection.kind === 'refused') return err({ kind: 'epub', error: inspection.refusal });

  const built = await deps.builder.build(files, report);
  if (!built.ok) return err({ kind: 'source', error: built.error });

  const content = contentOf(inspection, built.value.pages);
  if (!content.ok) return content;

  const layoutKind = content.value.layoutKind;

  const title = built.value.suggestedTitle;

  const book: Book = {
    id: bookId(deps.newId()),
    title,
    language: declaredLanguage(inspection) ?? languageOfTitle(title) ?? DEFAULT_LANGUAGE,
    layoutKind,
    direction: declaredDirection(inspection),
    pagePairing: DEFAULT_PAGE_PAIRING,
    pageFit: defaultPageFit(layoutKind),
    sourceKind: built.value.sourceKind,
    contentHash: hash,
    imageCount: content.value.imageCount,
    addedAt: deps.now(),
    position: content.value.position,
  };

  const startedAt = deps.now();
  const stored = await deps.repository.add(
    book,
    built.value.blob,
    content.value.cover,
    (writtenBytes, totalBytes) => {
      report({
        kind: 'storing',
        imageCount: content.value.imageCount,
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
