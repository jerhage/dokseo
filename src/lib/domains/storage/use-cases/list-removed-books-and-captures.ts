import type { RemovedShelfEntry } from '$lib/domains/library/domain/book/removed-book';
import { listBooks } from '$lib/domains/library/use-cases/list-books';
import type { ListBooksDeps } from '$lib/domains/library/use-cases/list-books';
import { listRemovedBooks } from '$lib/domains/library/use-cases/list-removed-books';
import type { ListRemovedBooksDeps } from '$lib/domains/library/use-cases/list-removed-books';
import { listEveryCapture } from '$lib/domains/recognition/use-cases/capture/list-every-capture';
import type { ListEveryCaptureDeps } from '$lib/domains/recognition/use-cases/capture/list-every-capture';
import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';

type ListRemovedBooksAndCapturesResult =
  | { readonly kind: 'success'; readonly entries: readonly RemovedShelfEntry[] }
  | StorageUnavailable;

type ListRemovedBooksAndCapturesDeps = {
  readonly shelf: ListBooksDeps;
  readonly removed: ListRemovedBooksDeps;
  readonly captures: ListEveryCaptureDeps;
};

type CapturedBook = { readonly bookId: BookId };

function captureCounts(captures: readonly CapturedBook[]): ReadonlyMap<BookId, number> {
  const counts = new Map<BookId, number>();
  for (const capture of captures) {
    counts.set(capture.bookId, (counts.get(capture.bookId) ?? 0) + 1);
  }
  return counts;
}

async function listRemovedBooksAndCaptures(
  deps: ListRemovedBooksAndCapturesDeps,
): Promise<ListRemovedBooksAndCapturesResult> {
  const shelf = await listBooks(deps.shelf);
  if (shelf.kind !== 'success') return shelf;
  const removed = await listRemovedBooks(deps.removed);
  if (removed.kind !== 'success') return removed;
  const captured = await listEveryCapture(deps.captures);
  if (captured.kind !== 'success') return captured;

  const held = new Set<BookId>([
    ...shelf.books.map((book) => book.id),
    ...shelf.unreadable.map((book) => book.id),
  ]);
  const counts = captureCounts(captured.captures);
  const recorded = removed.removed
    .filter((book) => !held.has(book.id))
    .map((book): RemovedShelfEntry => ({
      kind: 'recorded',
      book,
      captureCount: counts.get(book.id) ?? 0,
    }));
  const known = new Set<BookId>([...held, ...removed.removed.map((book) => book.id)]);
  const unknown = [...counts]
    .filter(([id]) => !known.has(id))
    .map(([id, captureCount]): RemovedShelfEntry => ({ kind: 'unknown', id, captureCount }));

  return { kind: 'success', entries: [...recorded, ...unknown] };
}

export { listRemovedBooksAndCaptures };
export type { ListRemovedBooksAndCapturesDeps, ListRemovedBooksAndCapturesResult };
