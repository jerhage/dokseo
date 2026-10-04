import type { UnreadableCapture } from '$lib/domains/recognition/domain/capture/capture';
import type { UnreadableTag } from '$lib/domains/recognition/domain/tag/tag';
import type { FileToSave } from '$lib/platform/files/save-file';
import { buildCapturesFile } from './build-captures-file';
import { CAPTURES_FILE_TYPE, exportDate } from './export-captures';

type UnreadableRowsToExport = {
  readonly captures: readonly UnreadableCapture[];
  readonly tags: readonly UnreadableTag[];
};

type UnreadableRowsExport = {
  readonly file: FileToSave;
  readonly captures: number;
  readonly tags: number;
};

type ExportUnreadableRowsResult =
  | { readonly kind: 'success'; readonly exported: UnreadableRowsExport }
  | { readonly kind: 'nothing-to-export' };

type ExportUnreadableRowsDeps = {
  readonly now: () => number;
  readonly appVersion: string;
};

function unreadableRowsFileName(exportedAt: number): string {
  return `dokseo-unreadable-${exportDate(exportedAt)}.json`;
}

function exportUnreadableRows(
  deps: ExportUnreadableRowsDeps,
  rows: UnreadableRowsToExport,
): ExportUnreadableRowsResult {
  if (rows.captures.length + rows.tags.length === 0) return { kind: 'nothing-to-export' };

  const exportedAt = deps.now();
  const built = buildCapturesFile({
    books: [],
    removedBooks: [],
    unreadableRemovedBooks: [],
    unreadableBooks: [],
    tags: [],
    unreadableTags: rows.tags,
    captures: [],
    unreadableCaptures: rows.captures,
    exportedAt,
    appVersion: deps.appVersion,
  });
  const file: FileToSave = {
    text: built.json,
    name: unreadableRowsFileName(exportedAt),
    type: CAPTURES_FILE_TYPE,
  };
  return {
    kind: 'success',
    exported: { file, captures: rows.captures.length, tags: rows.tags.length },
  };
}

export { exportUnreadableRows, unreadableRowsFileName };
export type {
  ExportUnreadableRowsDeps,
  ExportUnreadableRowsResult,
  UnreadableRowsExport,
  UnreadableRowsToExport,
};
