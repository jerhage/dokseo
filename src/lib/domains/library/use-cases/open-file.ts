import { match } from 'ts-pattern';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { ContentHash } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { LayoutKind, ReadingDirection } from '$lib/shared/layout-kind';
import { imagePlace, START_OF_THE_TEXT } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from '../domain/book/book';
import type { Book } from '../domain/book/book';
import { NOTHING_TO_MERGE } from '../domain/book/book-merge';
import type { HeldMerge, MergeInto } from '../domain/book/book-merge';
import { bookTitle, plausibleTitle, suggestTitle } from '../domain/book/title';
import {
  DEFAULT_BOOK_MATCHING,
  joinUpload,
  mergeableRows,
  restorableMatch,
} from '../domain/book/book-matching';
import type { BookMatching, UploadIdentity, UploadJoin } from '../domain/book/book-matching';
import type { LibraryRepository } from '../domain/book/library-repository';
import { INTRINSIC_ORDER } from '../domain/book/page-list';
import type { PageOrder } from '../domain/book/page-list';
import type { ContentHasher } from '../domain/ingest/content-hasher';
import type { EpubInspectionError } from '../domain/ingest/epub-inspection';
import type { EpubInspector } from '../domain/ingest/epub-inspector';
import type { PageObstacle } from '../domain/ingest/epub-pages';
import { detectSourceKind, fingerprintedFiles } from '../domain/ingest/source-detection';
import type {
  BuiltPages,
  BuiltSource,
  SourceBuildError,
  SourceBuilder,
} from '../domain/ingest/source-builder';
import { languageDeclared } from '../domain/ingest/declared-language';
import type { EpubPackage } from '../domain/ingest/epub-package';
import { languageOfTitle } from '../domain/ingest/title-language';
import { uploadManifest } from '../domain/ingest/upload-manifest';
import { uploadName } from '../domain/ingest/upload-name';
import type { UploadReport } from '../domain/ingest/upload-progress';

type OpenedUpload =
  | { readonly kind: 'added'; readonly book: Book }
  | { readonly kind: 'restored'; readonly book: Book }
  | { readonly kind: 'already-held'; readonly book: Book; readonly merge: HeldMerge };

type OpenFileFailure =
  | { readonly kind: 'source'; readonly failure: SourceBuildError }
  | { readonly kind: 'epub'; readonly failure: EpubInspectionError }
  | { readonly kind: 'not-paged'; readonly obstacle: PageObstacle }
  | { readonly kind: 'fingerprint'; readonly cause: string }
  | StorageUnavailable;

type OpenFileResult = OpenedUpload | OpenFileFailure;

type Hashed = { readonly kind: 'success'; readonly hash: ContentHash } | OpenFileFailure;

type Identified = { readonly kind: 'success'; readonly identity: UploadIdentity } | OpenFileFailure;

type ContentRead = { readonly kind: 'success'; readonly content: BookContent } | OpenFileFailure;

type OpenFileDeps = {
  readonly repository: LibraryRepository;
  readonly builder: SourceBuilder;
  readonly inspectEpub: EpubInspector;
  readonly partialMd5: ContentHasher;
  readonly mergeInto: MergeInto;
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

async function hashWith(hash: ContentHasher, upload: Blob): Promise<Hashed> {
  const hashed = await hash(upload);
  if (hashed.kind === 'unreadable') return { kind: 'fingerprint', cause: hashed.cause };
  return { kind: 'success', hash: contentHash(hashed.digest) };
}

async function uploadIdentity(deps: OpenFileDeps, files: readonly File[]): Promise<Identified> {
  const hashed = await hashWith(deps.partialMd5, hashedPart(fingerprintedFiles(files)));
  if (hashed.kind !== 'success') return hashed;
  return {
    kind: 'success',
    identity: { contentHash: hashed.hash, fileName: uploadName(files) },
  };
}

function joinedBook(join: UploadJoin): Book | null {
  return match(join)
    .returnType<Book | null>()
    .with({ kind: 'by-content' }, { kind: 'by-name' }, ({ book }) => book)
    .with({ kind: 'new' }, () => null)
    .exhaustive();
}

function fileTitleOf(files: readonly File[]): string {
  const names = files.map((file) =>
    file.webkitRelativePath.length > 0 ? file.webkitRelativePath : file.name,
  );
  const sourceKind = detectSourceKind(names);
  if (sourceKind === null) return '';
  return suggestTitle(
    sourceKind,
    files.map((file) => ({
      name: file.name.normalize('NFC'),
      path: file.webkitRelativePath.normalize('NFC'),
    })),
  );
}

async function mergeStrays(
  deps: OpenFileDeps,
  book: Book,
  identity: UploadIdentity,
  files: readonly File[],
): Promise<HeldMerge> {
  const restorable = await deps.repository.listRestorable();
  if (restorable.kind !== 'success') return restorable;
  const strays = mergeableRows(restorable.unreadable, {
    ...identity,
    title: book.title,
    fileTitle: fileTitleOf(files),
  }).filter((stray) => stray.id !== book.id);
  if (strays.length === 0) return NOTHING_TO_MERGE;

  return deps.mergeInto(
    book.id,
    strays.map((stray) => stray.id),
  );
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

function declaredTitle(inspection: UploadInspection, built: BuiltSource): string | null {
  if (inspection.kind !== 'epub') return built.metadataTitle;

  const declared = inspection.packageDocument.title;
  return declared === null ? null : plausibleTitle(declared);
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
  const identified = await uploadIdentity(deps, files);
  if (identified.kind !== 'success') return identified;
  const identity = identified.identity;

  const joined = joinedBook(joinUpload(held, identity, matching));
  if (joined !== null) {
    const merge = await mergeStrays(deps, joined, identity, files);
    return { kind: 'already-held', book: joined, merge };
  }

  const restorable = await deps.repository.listRestorable();
  if (restorable.kind !== 'success') return restorable;

  const inspection = await inspectUpload(deps, files);
  if (inspection.kind === 'refused') return { kind: 'epub', failure: inspection.refusal };

  const building = await deps.builder.build(files, report);
  if (building.kind !== 'success') return { kind: 'source', failure: building };
  const built = building.source;

  const read = contentOf(inspection, built.pages);
  if (read.kind !== 'success') return read;
  const content = read.content;

  const layoutKind = content.layoutKind;

  const fileTitle = built.suggestedTitle;
  const title = bookTitle(declaredTitle(inspection, built), fileTitle);
  report({ kind: 'titled', title });
  const restoring = restorableMatch(restorable, { ...identity, title, fileTitle });

  const book: Book = {
    id: restoring?.id ?? bookId(deps.newId()),
    title,
    alias: restoring?.alias ?? null,
    seriesId: restoring?.seriesId ?? null,
    volume: restoring?.volume ?? null,
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

  return restoring === null ? { kind: 'added', book } : { kind: 'restored', book };
}

export { openFile };
export type { OpenFileDeps, OpenFileFailure, OpenFileResult, OpenedUpload };
