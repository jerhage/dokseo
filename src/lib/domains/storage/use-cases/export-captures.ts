import { listBooks } from '$lib/domains/library/use-cases/list-books';
import type { ListBooksDeps } from '$lib/domains/library/use-cases/list-books';
import { listRemovedBooks } from '$lib/domains/library/use-cases/list-removed-books';
import type { ListRemovedBooksDeps } from '$lib/domains/library/use-cases/list-removed-books';
import { listEveryCapture } from '$lib/domains/recognition/use-cases/capture/list-every-capture';
import type { ListEveryCaptureDeps } from '$lib/domains/recognition/use-cases/capture/list-every-capture';
import { listTags } from '$lib/domains/recognition/use-cases/tag/list-tags';
import type { ListTagsDeps } from '$lib/domains/recognition/use-cases/tag/list-tags';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { buildCapturesFile } from './build-captures-file';

const CAPTURES_FILE_TYPE = 'application/json';

type UnreadableRows = {
  readonly books: number;
  readonly tags: number;
  readonly captures: number;
};

type CapturesExport = {
  readonly json: string;
  readonly fileName: string;
  readonly captures: number;
  readonly books: number;
  readonly bookless: number;
  readonly unreadable: UnreadableRows;
};

type ExportCapturesResult =
  | { readonly kind: 'success'; readonly exported: CapturesExport }
  | {
      readonly kind: 'nothing-to-export';
      readonly bookless: number;
      readonly unreadable: UnreadableRows;
    }
  | StorageUnavailable;

type ExportCapturesDeps = {
  readonly shelf: ListBooksDeps;
  readonly removed: ListRemovedBooksDeps;
  readonly tags: ListTagsDeps;
  readonly captures: ListEveryCaptureDeps;
  readonly now: () => number;
  readonly appVersion: string;
};

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function exportDate(exportedAt: number): string {
  const day = new Date(exportedAt);
  return `${day.getFullYear()}-${twoDigits(day.getMonth() + 1)}-${twoDigits(day.getDate())}`;
}

function capturesFileName(exportedAt: number): string {
  return `dokseo-captures-${exportDate(exportedAt)}.json`;
}

async function exportCaptures(deps: ExportCapturesDeps): Promise<ExportCapturesResult> {
  const [shelf, removed, tags, captures] = await Promise.all([
    listBooks(deps.shelf),
    listRemovedBooks(deps.removed),
    listTags(deps.tags),
    listEveryCapture(deps.captures),
  ]);
  if (shelf.kind !== 'success') return shelf;
  if (removed.kind !== 'success') return removed;
  if (tags.kind !== 'success') return tags;
  if (captures.kind !== 'success') return captures;

  const exportedAt = deps.now();
  const built = buildCapturesFile({
    books: shelf.books,
    removedBooks: removed.removed,
    tags: tags.tags,
    captures: captures.captures,
    exportedAt,
    appVersion: deps.appVersion,
  });
  const unreadable: UnreadableRows = {
    books: shelf.unreadable.length,
    tags: tags.unreadable.length,
    captures: captures.unreadable.length,
  };
  const bookless = built.bookless.length;
  if (built.file.captures.length === 0) return { kind: 'nothing-to-export', bookless, unreadable };

  return {
    kind: 'success',
    exported: {
      json: built.json,
      fileName: capturesFileName(exportedAt),
      captures: built.file.captures.length,
      books: built.file.books.length,
      bookless,
      unreadable,
    },
  };
}

export { CAPTURES_FILE_TYPE, capturesFileName, exportCaptures, exportDate };
export type { CapturesExport, ExportCapturesDeps, ExportCapturesResult, UnreadableRows };
