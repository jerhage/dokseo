import { match } from 'ts-pattern';
import { describeCause } from '$lib/shared/cause';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { ContentHash } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { LayoutKind, ReadingDirection } from '$lib/shared/layout-kind';
import { imagePlace, START_OF_THE_TEXT } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from '../domain/book/book';
import type { Book } from '../domain/book/book';
import { carriesLegacyHash, DEFAULT_BOOK_MATCHING, joinUpload } from '../domain/book/book-matching';
import type { BookMatching, UploadIdentity, UploadJoin } from '../domain/book/book-matching';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import { INTRINSIC_ORDER } from '../domain/book/page-list';
import type { PageOrder } from '../domain/book/page-list';
import type { EpubInspectionError } from '../domain/ingest/epub-inspection';
import type { EpubInspector } from '../domain/ingest/epub-inspector';
import type { PageObstacle } from '../domain/ingest/epub-pages';
import { detectSourceKind, fingerprintedFiles } from '../domain/ingest/source-detection';
import type { BuiltPages, SourceBuildError, SourceBuilder } from '../domain/ingest/source-builder';
import { languageDeclared } from '../domain/ingest/declared-language';
import type { EpubPackage } from '../domain/ingest/epub-package';
import { languageOfTitle } from '../domain/ingest/title-language';
import { uploadManifest } from '../domain/ingest/upload-manifest';
import { uploadName } from '../domain/ingest/upload-name';
import type { UploadReport } from '../domain/ingest/upload-progress';

type OpenFileError =
  | { readonly kind: 'source'; readonly error: SourceBuildError }
  | { readonly kind: 'storage'; readonly error: LibraryError }
  | { readonly kind: 'epub'; readonly error: EpubInspectionError }
  | { readonly kind: 'not-paged'; readonly obstacle: PageObstacle }
  | { readonly kind: 'fingerprint'; readonly cause: string };

type OpenedUpload =
  | { readonly kind: 'added'; readonly book: Book }
  | { readonly kind: 'already-held'; readonly book: Book };

type OpenFileDeps = {
  readonly repository: LibraryRepository;
  readonly builder: SourceBuilder;
  readonly inspectEpub: EpubInspector;
  readonly partialMd5: (blob: Blob) => Promise<string>;
  readonly legacyFingerprint: (blob: Blob) => Promise<string>;
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

async function hashWith(
  hash: (blob: Blob) => Promise<string>,
  upload: Blob,
): Promise<Result<ContentHash, OpenFileError>> {
  let digest: string;
  try {
    digest = await hash(upload);
  } catch (cause) {
    return err({ kind: 'fingerprint', cause: describeCause(cause) });
  }
  return ok(contentHash(digest));
}

async function legacyHashIfHeld(
  deps: OpenFileDeps,
  held: readonly Book[],
  upload: Blob,
): Promise<Result<ContentHash | null, OpenFileError>> {
  if (!held.some(carriesLegacyHash)) return ok(null);
  const legacy = await hashWith(deps.legacyFingerprint, upload);
  return legacy;
}

async function uploadIdentity(
  deps: OpenFileDeps,
  held: readonly Book[],
  files: readonly File[],
): Promise<Result<UploadIdentity, OpenFileError>> {
  const hashed = await hashWith(deps.partialMd5, hashedPart(fingerprintedFiles(files)));
  if (!hashed.ok) return hashed;
  const legacy = await legacyHashIfHeld(deps, held, hashedPart(files));
  if (!legacy.ok) return legacy;
  return ok({ contentHash: hashed.value, legacyHash: legacy.value, fileName: uploadName(files) });
}

async function rejoinLegacy(
  deps: OpenFileDeps,
  book: Book,
  identity: UploadIdentity,
): Promise<Result<OpenedUpload, OpenFileError>> {
  const upgraded = await deps.repository.update(book.id, {
    contentHash: identity.contentHash,
    fileName: identity.fileName,
  });
  if (!upgraded.ok) return err({ kind: 'storage', error: upgraded.error });
  return ok({ kind: 'already-held', book: upgraded.value });
}

function joinedBook(
  deps: OpenFileDeps,
  join: UploadJoin,
  identity: UploadIdentity,
): Promise<Result<OpenedUpload, OpenFileError>> | null {
  return match(join)
    .returnType<Promise<Result<OpenedUpload, OpenFileError>> | null>()
    .with({ kind: 'by-content' }, { kind: 'by-name' }, ({ book }) =>
      Promise.resolve(ok({ kind: 'already-held', book })),
    )
    .with({ kind: 'by-legacy-content' }, ({ book }) => rejoinLegacy(deps, book, identity))
    .with({ kind: 'new' }, () => null)
    .exhaustive();
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
  readonly order: PageOrder;
};

const NO_IMAGES = 0;

function flowContent(cover: Blob | null): BookContent {
  return {
    layoutKind: 'flow',
    imageCount: NO_IMAGES,
    cover,
    position: START_OF_THE_TEXT,
    order: INTRINSIC_ORDER,
  };
}

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
      order: pages.order,
    });
  }
  if (!declaresReflowing(inspection)) return err({ kind: 'not-paged', obstacle: pages.obstacle });

  return ok(flowContent(pages.cover));
}

function declaredLanguage(inspection: UploadInspection): Language | null {
  if (inspection.kind !== 'epub') return null;

  return languageDeclared(inspection.packageDocument.language);
}

const EPUB_READS_LEFT_TO_RIGHT_UNLESS_IT_SAYS_OTHERWISE: ReadingDirection = 'ltr';

function declaredDirection(inspection: UploadInspection): ReadingDirection {
  if (inspection.kind !== 'epub') return DEFAULT_DIRECTION;
  if (inspection.packageDocument.direction === 'default') {
    return EPUB_READS_LEFT_TO_RIGHT_UNLESS_IT_SAYS_OTHERWISE;
  }

  return inspection.packageDocument.direction;
}

async function openFile(
  deps: OpenFileDeps,
  files: readonly File[],
  report: UploadReport = () => undefined,
  matching: BookMatching = DEFAULT_BOOK_MATCHING,
): Promise<Result<OpenedUpload, OpenFileError>> {
  await deps.requestPersistence();

  const held = await deps.repository.list();
  if (!held.ok) return err({ kind: 'storage', error: held.error });
  const identified = await uploadIdentity(deps, held.value, files);
  if (!identified.ok) return identified;
  const identity = identified.value;

  const joined = joinedBook(deps, joinUpload(held.value, identity, matching), identity);
  if (joined !== null) {
    const outcome = await joined;
    return outcome;
  }

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
    contentHash: identity.contentHash,
    fileName: identity.fileName,
    imageCount: content.value.imageCount,
    addedAt: deps.now(),
    position: content.value.position,
    lastReadAt: null,
    finishedAt: null,
  };

  const startedAt = deps.now();
  const stored = await deps.repository.add(
    book,
    built.value.blob,
    content.value.cover,
    content.value.order,
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

  return ok({ kind: 'added', book });
}

export { openFile };
export type { OpenFileError, OpenFileDeps, OpenedUpload };
