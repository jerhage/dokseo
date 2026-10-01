import { match } from 'ts-pattern';
import { describeCause } from '$lib/shared/cause';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId, ContentHash } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { LayoutKind, ReadingDirection } from '$lib/shared/layout-kind';
import { imagePlace, START_OF_THE_TEXT } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from '../domain/book/book';
import type { Book } from '../domain/book/book';
import { carriesLegacyHash, DEFAULT_BOOK_MATCHING, joinUpload } from '../domain/book/book-matching';
import type { BookMatching, UploadIdentity, UploadJoin } from '../domain/book/book-matching';
import type { LibraryRepository } from '../domain/book/library-repository';
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

type OpenedUpload =
  | { readonly kind: 'added'; readonly book: Book }
  | { readonly kind: 'already-held'; readonly book: Book };

type OpenFileFailure =
  | { readonly kind: 'source'; readonly failure: SourceBuildError }
  | { readonly kind: 'epub'; readonly failure: EpubInspectionError }
  | { readonly kind: 'not-paged'; readonly obstacle: PageObstacle }
  | { readonly kind: 'fingerprint'; readonly cause: string }
  | { readonly kind: 'not-found'; readonly id: BookId }
  | StorageUnavailable;

type OpenFileResult = OpenedUpload | OpenFileFailure;

type Hashed = { readonly kind: 'success'; readonly hash: ContentHash } | OpenFileFailure;

type LegacyHashed =
  | { readonly kind: 'success'; readonly hash: ContentHash | null }
  | OpenFileFailure;

type Identified = { readonly kind: 'success'; readonly identity: UploadIdentity } | OpenFileFailure;

type ContentRead = { readonly kind: 'success'; readonly content: BookContent } | OpenFileFailure;

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

async function hashWith(hash: (blob: Blob) => Promise<string>, upload: Blob): Promise<Hashed> {
  let digest: string;
  try {
    digest = await hash(upload);
  } catch (cause) {
    return { kind: 'fingerprint', cause: describeCause(cause) };
  }
  return { kind: 'success', hash: contentHash(digest) };
}

async function legacyHashIfHeld(
  deps: OpenFileDeps,
  held: readonly Book[],
  upload: Blob,
): Promise<LegacyHashed> {
  if (!held.some(carriesLegacyHash)) return { kind: 'success', hash: null };
  const legacy = await hashWith(deps.legacyFingerprint, upload);
  return legacy;
}

async function uploadIdentity(
  deps: OpenFileDeps,
  held: readonly Book[],
  files: readonly File[],
): Promise<Identified> {
  const hashed = await hashWith(deps.partialMd5, hashedPart(fingerprintedFiles(files)));
  if (hashed.kind !== 'success') return hashed;
  const legacy = await legacyHashIfHeld(deps, held, hashedPart(files));
  if (legacy.kind !== 'success') return legacy;
  return {
    kind: 'success',
    identity: { contentHash: hashed.hash, legacyHash: legacy.hash, fileName: uploadName(files) },
  };
}

async function rejoinLegacy(
  deps: OpenFileDeps,
  book: Book,
  identity: UploadIdentity,
): Promise<OpenFileResult> {
  const upgraded = await deps.repository.update(book.id, {
    contentHash: identity.contentHash,
    fileName: identity.fileName,
  });
  if (upgraded.kind !== 'success') return upgraded;
  if (upgraded.book === null) return { kind: 'not-found', id: book.id };
  return { kind: 'already-held', book: upgraded.book };
}

function joinedBook(
  deps: OpenFileDeps,
  join: UploadJoin,
  identity: UploadIdentity,
): Promise<OpenFileResult> | null {
  return match(join)
    .returnType<Promise<OpenFileResult> | null>()
    .with({ kind: 'by-content' }, { kind: 'by-name' }, ({ book }) =>
      Promise.resolve({ kind: 'already-held', book }),
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
  if (inspected.kind !== 'success') return { kind: 'refused', refusal: inspected };
  if (inspected.inspection.kind === 'not-an-epub') return NOT_AN_EPUB;

  return { kind: 'epub', packageDocument: inspected.inspection.packageDocument };
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

function contentOf(inspection: UploadInspection, pages: BuiltPages): ContentRead {
  if (pages.kind === 'images') {
    return {
      kind: 'success',
      content: {
        layoutKind: 'paged',
        imageCount: pages.imageCount,
        cover: pages.cover,
        position: imagePlace(imageIndex(0)),
        order: pages.order,
      },
    };
  }
  if (!declaresReflowing(inspection)) return { kind: 'not-paged', obstacle: pages.obstacle };

  return { kind: 'success', content: flowContent(pages.cover) };
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
): Promise<OpenFileResult> {
  await deps.requestPersistence();

  const listed = await deps.repository.list();
  if (listed.kind !== 'success') return listed;
  const held = listed.books;
  const identified = await uploadIdentity(deps, held, files);
  if (identified.kind !== 'success') return identified;
  const identity = identified.identity;

  const joined = joinedBook(deps, joinUpload(held, identity, matching), identity);
  if (joined !== null) {
    const outcome = await joined;
    return outcome;
  }

  const inspection = await inspectUpload(deps, files);
  if (inspection.kind === 'refused') return { kind: 'epub', failure: inspection.refusal };

  const building = await deps.builder.build(files, report);
  if (building.kind !== 'success') return { kind: 'source', failure: building };
  const built = building.source;

  const read = contentOf(inspection, built.pages);
  if (read.kind !== 'success') return read;
  const content = read.content;

  const layoutKind = content.layoutKind;

  const title = built.suggestedTitle;

  const book: Book = {
    id: bookId(deps.newId()),
    title,
    language: declaredLanguage(inspection) ?? languageOfTitle(title) ?? DEFAULT_LANGUAGE,
    layoutKind,
    direction: declaredDirection(inspection),
    pagePairing: DEFAULT_PAGE_PAIRING,
    pageFit: defaultPageFit(layoutKind),
    sourceKind: built.sourceKind,
    contentHash: identity.contentHash,
    fileName: identity.fileName,
    imageCount: content.imageCount,
    addedAt: deps.now(),
    position: content.position,
    lastReadAt: null,
    finishedAt: null,
  };

  const startedAt = deps.now();
  const stored = await deps.repository.add(
    book,
    built.blob,
    content.cover,
    content.order,
    (writtenBytes, totalBytes) => {
      report({
        kind: 'storing',
        imageCount: content.imageCount,
        writtenBytes,
        totalBytes,
        elapsedMs: deps.now() - startedAt,
      });
    },
  );
  if (stored.kind !== 'success') return stored;

  return { kind: 'added', book };
}

export { openFile };
export type { OpenFileDeps, OpenFileFailure, OpenFileResult, OpenedUpload };
