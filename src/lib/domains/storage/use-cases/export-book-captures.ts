import { listBooks } from '$lib/domains/library/use-cases/list-books';
import type { ListBooksDeps } from '$lib/domains/library/use-cases/list-books';
import { listRemovedBooks } from '$lib/domains/library/use-cases/list-removed-books';
import type { ListRemovedBooksDeps } from '$lib/domains/library/use-cases/list-removed-books';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import { listCaptures } from '$lib/domains/recognition/use-cases/capture/list-captures';
import type { ListCapturesDeps } from '$lib/domains/recognition/use-cases/capture/list-captures';
import { listTags } from '$lib/domains/recognition/use-cases/tag/list-tags';
import type { ListTagsDeps } from '$lib/domains/recognition/use-cases/tag/list-tags';
import type { FileToSave } from '$lib/platform/files/save-file';
import type { BookId } from '$lib/shared/ids';
import { shownTitle } from '$lib/shared/shown-title';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { buildCapturesFile } from './build-captures-file';
import { CAPTURES_FILE_TYPE, capturesFileName, exportDate } from './export-captures';

const TITLE_SLUG_LENGTH = 60;

type BookCapturesExport = {
  readonly file: FileToSave;
  readonly captures: number;
};

type ExportBookCapturesResult =
  | { readonly kind: 'success'; readonly exported: BookCapturesExport }
  | { readonly kind: 'nothing-to-export' }
  | StorageUnavailable;

type ExportBookCapturesDeps = {
  readonly shelf: ListBooksDeps;
  readonly removed: ListRemovedBooksDeps;
  readonly tags: ListTagsDeps;
  readonly captures: ListCapturesDeps;
  readonly now: () => number;
  readonly appVersion: string;
};

function titleSlug(title: string): string {
  const words = title
    .normalize('NFC')
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{M}\p{N}]+/gu, '-');
  const cut = Array.from(words).slice(0, TITLE_SLUG_LENGTH).join('');
  return cut.replaceAll(/^-+|-+$/g, '');
}

function bookCapturesFileName(title: string, exportedAt: number): string {
  const slug = titleSlug(title);
  if (slug.length === 0) return capturesFileName(exportedAt);
  return `dokseo-captures-${slug}-${exportDate(exportedAt)}.json`;
}

function tagsUsedBy(tags: readonly Tag[], captures: readonly Capture[]): readonly Tag[] {
  const used = new Set(captures.flatMap((capture) => capture.tagIds));
  return tags.filter((tag) => used.has(tag.id));
}

async function exportBookCaptures(
  deps: ExportBookCapturesDeps,
  id: BookId,
): Promise<ExportBookCapturesResult> {
  const [shelf, removed, tags, captures] = await Promise.all([
    listBooks(deps.shelf),
    listRemovedBooks(deps.removed),
    listTags(deps.tags),
    listCaptures(deps.captures, id),
  ]);
  if (shelf.kind !== 'success') return shelf;
  if (removed.kind !== 'success') return removed;
  if (tags.kind !== 'success') return tags;
  if (captures.kind !== 'success') return captures;

  const book =
    shelf.books.find((held) => held.id === id) ??
    removed.removed.find((held) => held.id === id) ??
    removed.unreadable.find((held) => held.id === id);
  if (book === undefined) return { kind: 'nothing-to-export' };

  const exportedAt = deps.now();
  const built = buildCapturesFile({
    books: shelf.books.filter((held) => held.id === id),
    removedBooks: removed.removed.filter((held) => held.id === id),
    unreadableRemovedBooks: removed.unreadable.filter((held) => held.id === id),
    unreadableBooks: [],
    tags: tagsUsedBy(tags.tags, captures.captures),
    unreadableTags: [],
    captures: captures.captures,
    unreadableCaptures: [],
    exportedAt,
    appVersion: deps.appVersion,
  });
  const count = built.file.captures.length;
  if (count === 0) return { kind: 'nothing-to-export' };

  const file: FileToSave = {
    text: built.json,
    name: bookCapturesFileName(shownTitle(book), exportedAt),
    type: CAPTURES_FILE_TYPE,
  };
  return { kind: 'success', exported: { file, captures: count } };
}

export { bookCapturesFileName, exportBookCaptures, titleSlug };
export type { BookCapturesExport, ExportBookCapturesDeps, ExportBookCapturesResult };
