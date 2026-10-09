import { describe, expect, it } from 'vitest';
import type { FileToSave } from '$lib/platform/files/save-file';
import { exportStatus, leftOutNotes, savedNotes, savedText } from './captures-export-rules';
import type { ExportSummary } from './captures-export-rules';

const NONE_UNREADABLE = { books: 0, tags: 0, captures: 0 };

const SUMMARY: ExportSummary = {
  captures: 12,
  books: 3,
  bookless: 1,
  unreadable: NONE_UNREADABLE,
  storedUnreadable: 0,
};

const FILE: FileToSave = {
  text: '{"format":"dokseo-captures"}',
  name: 'dokseo-captures-2026-10-03.json',
  type: 'application/json',
};

describe('savedText', () => {
  it('counts the captures and books written', () => {
    expect(savedText(SUMMARY)).toBe('Exported 12 captures from 3 books.');
  });

  it('writes a single capture and book in the singular', () => {
    expect(savedText({ ...SUMMARY, captures: 1, books: 1 })).toBe(
      'Exported 1 capture from 1 book.',
    );
  });
});

describe('leftOutNotes', () => {
  it('says nothing when nothing was left out', () => {
    expect(leftOutNotes({ bookless: 0, unreadable: NONE_UNREADABLE })).toEqual([]);
  });

  it('names each kind of row that was left out', () => {
    expect(
      leftOutNotes({
        bookless: 2,
        unreadable: { books: 1, tags: 3, captures: 4 },
      }),
    ).toEqual([
      '2 captures belong to no book and were left out.',
      '4 stored captures could not be read and were left out.',
      '3 stored tags could not be read and were left out.',
      '1 stored book could not be read.',
    ]);
  });

  it('writes a single left-out capture in the singular', () => {
    expect(leftOutNotes({ bookless: 1, unreadable: NONE_UNREADABLE })).toEqual([
      '1 capture belongs to no book and was left out.',
    ]);
  });
});

describe('savedNotes', () => {
  it('says nothing about kept rows when the file keeps none', () => {
    expect(savedNotes({ ...SUMMARY, bookless: 0 })).toEqual([]);
  });

  it('writes a single kept row in the singular, after the unreadable books', () => {
    expect(
      savedNotes({
        ...SUMMARY,
        bookless: 0,
        unreadable: { books: 1, tags: 0, captures: 1 },
        storedUnreadable: 1,
      }),
    ).toEqual([
      '1 stored book could not be read.',
      '1 stored row that could not be read is kept in the file as it was stored. Import does not bring it back.',
    ]);
  });
});

describe('exportStatus', () => {
  it('shows nothing while idle or exporting', () => {
    expect(exportStatus({ kind: 'idle' })).toBeNull();
    expect(exportStatus({ kind: 'exporting' })).toBeNull();
  });

  it('reports a saved export as a success with what was left out', () => {
    expect(exportStatus({ kind: 'saved', summary: SUMMARY })).toEqual({
      variant: 'success',
      message: 'Exported 12 captures from 3 books.',
      notes: ['1 capture belongs to no book and was left out.'],
    });
  });

  it('reports the stored rows kept in the file when there are any', () => {
    const summary = {
      ...SUMMARY,
      unreadable: { books: 0, tags: 2, captures: 3 },
      storedUnreadable: 5,
    };

    expect(exportStatus({ kind: 'saved', summary })?.notes).toEqual([
      '1 capture belongs to no book and was left out.',
      '5 stored rows that could not be read are kept in the file as they were stored. Import does not bring them back.',
    ]);
  });

  it('says there is nothing to export, with what was left out', () => {
    expect(
      exportStatus({
        kind: 'nothing-to-export',
        leftOut: { bookless: 2, unreadable: NONE_UNREADABLE },
      }),
    ).toEqual({
      variant: 'info',
      message: 'There are no captures to export.',
      notes: ['2 captures belong to no book and were left out.'],
    });
  });

  it('asks for a tap on Save file when the share sheet needs one', () => {
    expect(exportStatus({ kind: 'needs-another-tap', file: FILE, summary: SUMMARY })).toMatchObject(
      {
        variant: 'info',
        message: expect.stringContaining('Tap Save file'),
      },
    );
  });

  it('warns when the browser blocks local storage', () => {
    expect(exportStatus({ kind: 'storage-unavailable' })).toMatchObject({
      variant: 'warning',
    });
  });
});
