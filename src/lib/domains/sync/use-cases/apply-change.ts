import { match } from 'ts-pattern';
import { applyRemoteCatalog } from '$lib/domains/catalog/use-cases/apply-remote-catalog';
import { applyRemoteCatalogRemoval } from '$lib/domains/catalog/use-cases/apply-remote-catalog-removal';
import type { ApplyRemoteCatalogRemovalDeps } from '$lib/domains/catalog/use-cases/apply-remote-catalog-removal';
import { placeFitsLayout } from '$lib/domains/library/domain/book/book';
import type { Book, BookEdit } from '$lib/domains/library/domain/book/book';
import type { LibraryRepository } from '$lib/domains/library/domain/book/library-repository';
import { acceptRemoteBookVersion } from '$lib/domains/library/use-cases/accept-remote-book-version';
import { applyRemoteBookEdit } from '$lib/domains/library/use-cases/apply-remote-book-edit';
import { applyRemoteBookRemoval } from '$lib/domains/library/use-cases/apply-remote-book-removal';
import type { CaptureRepository } from '$lib/domains/recognition/domain/capture/capture-repository';
import { applyRemoteCapture } from '$lib/domains/recognition/use-cases/capture/apply-remote-capture';
import { applyRemoteCaptureRemoval } from '$lib/domains/recognition/use-cases/capture/apply-remote-capture-removal';
import { applyRemoteTag } from '$lib/domains/recognition/use-cases/tag/apply-remote-tag';
import { applyRemoteTagRemoval } from '$lib/domains/recognition/use-cases/tag/apply-remote-tag-removal';
import type { AcceptedVersion } from '$lib/shared/change-marker';
import { captureId, catalogId, tagId } from '$lib/shared/ids';
import { imageLayoutKind } from '$lib/shared/layout-kind';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Change } from '../domain/change';
import type { HeldChangeStore } from '../domain/held-changes';
import { fromSyncBookData } from './book-data';
import type { SyncedBook } from './book-data';
import { fromSyncCaptureData, placedCapture } from './capture-data';
import { fromSyncCatalogData } from './catalog-data';
import { fromSyncPositionData } from './position-data';
import { fromSyncTagData } from './tag-data';

type ApplyDeps = {
  readonly shelf: { readonly repository: LibraryRepository; readonly now: () => number };
  readonly captures: { readonly captures: CaptureRepository };
  readonly catalogs: ApplyRemoteCatalogRemovalDeps;
  readonly held: HeldChangeStore;
};

type ApplyOutcome =
  | { readonly kind: 'applied' }
  | { readonly kind: 'not-ready' }
  | { readonly kind: 'unreadable' }
  | StorageUnavailable;

type BooksByHash = Map<string, Book>;

const APPLIED: ApplyOutcome = { kind: 'applied' };

const NOT_READY: ApplyOutcome = { kind: 'not-ready' };

const UNREADABLE: ApplyOutcome = { kind: 'unreadable' };

function acceptedBy(change: Change): AcceptedVersion {
  return {
    kind: change.kind,
    recordId: change.recordId,
    version: { updatedAt: change.updatedAt, deviceId: change.deviceId },
  };
}

function appliedOr(written: { readonly kind: 'success' } | StorageUnavailable): ApplyOutcome {
  return written.kind === 'success' ? APPLIED : written;
}

function identityEdit(local: Book, synced: SyncedBook): BookEdit {
  const edit: BookEdit = {
    alias: synced.alias,
    seriesId: synced.seriesId,
    volume: synced.volume,
    language: synced.language,
    direction: synced.direction,
  };
  const layoutKind = imageLayoutKind(synced.layoutKind);
  if (layoutKind === null || local.layoutKind === 'flow') return edit;
  return { ...edit, layoutKind };
}

async function editBook(
  deps: ApplyDeps,
  local: Book,
  edit: BookEdit,
  accepted: AcceptedVersion,
): Promise<ApplyOutcome> {
  const written = await applyRemoteBookEdit(deps.shelf, local.id, edit, accepted);
  if (written.kind === 'not-found') return NOT_READY;
  return appliedOr(written);
}

async function applyTag(deps: ApplyDeps, change: Change): Promise<ApplyOutcome> {
  const accepted = acceptedBy(change);
  const id = tagId(change.recordId);
  if (change.data === null)
    return appliedOr(await applyRemoteTagRemoval(deps.captures, id, accepted));
  const read = fromSyncTagData(change.data, id);
  if (read.kind !== 'success') return UNREADABLE;
  return appliedOr(await applyRemoteTag(deps.captures, read.tag, accepted));
}

async function applyCatalog(deps: ApplyDeps, change: Change): Promise<ApplyOutcome> {
  const accepted = acceptedBy(change);
  const id = catalogId(change.recordId);
  if (change.data === null) {
    return appliedOr(await applyRemoteCatalogRemoval(deps.catalogs, id, accepted));
  }
  const read = fromSyncCatalogData(change.data, id);
  if (read.kind !== 'success') return UNREADABLE;
  return appliedOr(await applyRemoteCatalog(deps.catalogs, read.catalog, accepted));
}

async function applyCapture(
  deps: ApplyDeps,
  books: BooksByHash,
  change: Change,
): Promise<ApplyOutcome> {
  const accepted = acceptedBy(change);
  const id = captureId(change.recordId);
  if (change.data === null) {
    return appliedOr(await applyRemoteCaptureRemoval(deps.captures, id, accepted));
  }
  const read = fromSyncCaptureData(change.data, id);
  if (read.kind !== 'success') return UNREADABLE;
  const book = books.get(read.bookKey);
  if (book === undefined) return NOT_READY;
  const capture = placedCapture(read.capture, book.id);
  return appliedOr(await applyRemoteCapture(deps.captures, capture, accepted));
}

async function applyBookRemoval(
  deps: ApplyDeps,
  books: BooksByHash,
  change: Change,
): Promise<ApplyOutcome> {
  const accepted = acceptedBy(change);
  const local = books.get(change.recordId);
  if (local === undefined) return appliedOr(await acceptRemoteBookVersion(deps.shelf, accepted));
  const removed = await applyRemoteBookRemoval(deps.shelf, local.id, accepted);
  if (removed.kind === 'storage-unavailable') return removed;
  books.delete(change.recordId);
  if (removed.kind === 'not-found') {
    return appliedOr(await acceptRemoteBookVersion(deps.shelf, accepted));
  }
  return APPLIED;
}

async function applyBook(
  deps: ApplyDeps,
  books: BooksByHash,
  change: Change,
): Promise<ApplyOutcome> {
  if (change.data === null) return applyBookRemoval(deps, books, change);
  const read = fromSyncBookData(change.data);
  if (read.kind !== 'success') return UNREADABLE;
  const local = books.get(change.recordId);
  if (local === undefined) return NOT_READY;
  return editBook(deps, local, identityEdit(local, read.book), acceptedBy(change));
}

async function applyPosition(
  deps: ApplyDeps,
  books: BooksByHash,
  change: Change,
): Promise<ApplyOutcome> {
  const accepted = acceptedBy(change);
  if (change.data === null) return appliedOr(await acceptRemoteBookVersion(deps.shelf, accepted));
  const read = fromSyncPositionData(change.data);
  if (read.kind !== 'success') return UNREADABLE;
  const local = books.get(change.recordId);
  if (local === undefined) return NOT_READY;
  const { place, lastReadAt, finishedAt } = read.position;
  if (!placeFitsLayout(local.layoutKind, place)) return UNREADABLE;
  return editBook(deps, local, { position: place, lastReadAt, finishedAt }, accepted);
}

function applyChange(deps: ApplyDeps, books: BooksByHash, change: Change): Promise<ApplyOutcome> {
  return match(change.kind)
    .returnType<Promise<ApplyOutcome>>()
    .with('tag', () => applyTag(deps, change))
    .with('catalog', () => applyCatalog(deps, change))
    .with('capture', () => applyCapture(deps, books, change))
    .with('book', () => applyBook(deps, books, change))
    .with('position', () => applyPosition(deps, books, change))
    .exhaustive();
}

export { applyChange };
export type { ApplyDeps, ApplyOutcome, BooksByHash };
