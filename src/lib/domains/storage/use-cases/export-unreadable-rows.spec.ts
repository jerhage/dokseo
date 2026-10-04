import { describe, expect, it } from 'vitest';
import type { UnreadableCapture } from '$lib/domains/recognition/domain/capture/capture';
import type { UnreadableTag } from '$lib/domains/recognition/domain/tag/tag';
import { captureId, tagId } from '$lib/shared/ids';
import { exportUnreadableRows, unreadableRowsFileName } from './export-unreadable-rows';
import type { ExportUnreadableRowsDeps } from './export-unreadable-rows';
import { readCapturesFile } from './read-captures-file';

const EXPORTED_AT = new Date(2026, 9, 4, 8, 15).getTime();

const DEPS: ExportUnreadableRowsDeps = { now: () => EXPORTED_AT, appVersion: '0.9.3' };

const OLD_ROW = { id: 'old', bookId: 'book-1', text: 'あ', confidence: Number.NaN, pinned: true };

const OLD_CAPTURE: UnreadableCapture = { id: captureId('old'), stored: OLD_ROW };

const NAMELESS_TAG: UnreadableTag = {
  id: tagId('nameless'),
  name: null,
  stored: { id: 'nameless', colour: 'gold' },
};

function exported(captures: readonly UnreadableCapture[], tags: readonly UnreadableTag[]) {
  const result = exportUnreadableRows(DEPS, { captures, tags });
  if (result.kind !== 'success') throw new Error(result.kind);
  return result.exported;
}

describe('exportUnreadableRows', () => {
  it('writes only the unreadable rows, as stored, in the unreadable section of a version 1 file', () => {
    const file = JSON.parse(exported([OLD_CAPTURE], [NAMELESS_TAG]).file.text);

    expect(file).toEqual({
      format: 'dokseo-captures',
      version: 1,
      exportedAt: EXPORTED_AT,
      appVersion: '0.9.3',
      books: [],
      tags: [],
      captures: [],
      unreadable: {
        books: [],
        tags: [{ id: 'nameless', colour: 'gold' }],
        captures: [{ id: 'old', bookId: 'book-1', text: 'あ', confidence: null, pinned: true }],
      },
    });
  });

  it('names the file plainly by the local date and counts the rows', () => {
    expect(exported([OLD_CAPTURE], [])).toMatchObject({
      file: { name: 'dokseo-unreadable-2026-10-04.json', type: 'application/json' },
      captures: 1,
      tags: 0,
    });
  });

  it('builds a file the import reads as holding nothing to import and the rows it keeps', () => {
    const read = readCapturesFile(exported([OLD_CAPTURE], [NAMELESS_TAG]).file.text);

    expect(read).toMatchObject({
      kind: 'read',
      books: [],
      tags: [],
      captures: [],
      unreadable: [],
      storedUnreadable: 2,
    });
  });

  it('reports nothing to export when no row is given', () => {
    expect(exportUnreadableRows(DEPS, { captures: [], tags: [] })).toEqual({
      kind: 'nothing-to-export',
    });
  });
});

describe('unreadableRowsFileName', () => {
  it('pads the month and the day to two digits', () => {
    expect(unreadableRowsFileName(new Date(2026, 0, 5, 9).getTime())).toBe(
      'dokseo-unreadable-2026-01-05.json',
    );
  });
});
