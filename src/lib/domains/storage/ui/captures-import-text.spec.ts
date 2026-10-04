import { describe, expect, it } from 'vitest';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { CapturesImportSummary } from '../use-cases/captures-import-plan';
import {
  importStatus,
  importedNotes,
  nothingToWrite,
  previewRows,
  unreadableLines,
  versionLabel,
} from './captures-import-text';

const NOTHING: CapturesImportSummary = {
  added: 0,
  identical: 0,
  tagsOnly: 0,
  conflicts: 0,
  onAnotherBook: 0,
  notOnThisDevice: { books: 0, captures: 0 },
  newTags: 0,
  unreadable: 0,
  droppedTags: 0,
  storedUnreadable: 0,
};

const CAPTURE: Capture = {
  id: captureId('c'),
  bookId: bookId('b'),
  anchor: regionAnchor([{ index: imageIndex(0), rect: pageRect(0.001, 0.002, 0.003, 0.004) }]),
  text: 'text',
  origin: 'written',
  createdAt: 100,
  editedAt: null,
  tagIds: [],
};

describe('nothingToWrite', () => {
  it('reports nothing to write when every capture is already here', () => {
    expect(nothingToWrite({ ...NOTHING, identical: 4, unreadable: 1 })).toBe(true);
  });

  it.each([
    ['a new capture', { added: 1 }],
    ['a tag to merge', { tagsOnly: 1 }],
    ['a conflict', { conflicts: 1 }],
    ['a new tag', { newTags: 1 }],
  ])('reports something to write for %s', (_name, fields) => {
    expect(nothingToWrite({ ...NOTHING, ...fields })).toBe(false);
  });
});

describe('previewRows', () => {
  it('lists only the counts that are not zero', () => {
    expect(previewRows({ ...NOTHING, added: 3, newTags: 1 })).toEqual([
      { title: 'New captures', description: undefined, value: '3' },
      { title: 'New tags', description: undefined, value: '1' },
    ]);
  });

  it('counts captures gaining tags as already here, and says how many gain tags', () => {
    expect(previewRows({ ...NOTHING, identical: 2, tagsOnly: 1 })).toEqual([
      { title: 'Already here', description: '1 gains tags from the file.', value: '3' },
    ]);
  });

  it('says captures for absent books wait in Removed books', () => {
    const [, held] = previewRows({
      ...NOTHING,
      added: 4,
      notOnThisDevice: { books: 1, captures: 4 },
    });

    expect(held).toMatchObject({ title: 'For books not on this device', value: '4' });
    expect(held?.description).toContain('Removed books');
  });

  it('lists conflicts and unreadable entries', () => {
    expect(
      previewRows({ ...NOTHING, conflicts: 2, unreadable: 1 }).map((row) => row.title),
    ).toEqual(['Conflicts', 'Could not be read']);
  });

  it('says how many unreadable rows the file keeps without importing them', () => {
    expect(previewRows({ ...NOTHING, added: 1, storedUnreadable: 4 })).toEqual([
      { title: 'New captures', description: undefined, value: '1' },
      {
        title: 'Unreadable rows kept in the file',
        description: 'Not imported. The file keeps them as they were stored.',
        value: '4',
      },
    ]);
  });
});

describe('unreadableLines', () => {
  it("names each entry by section and position, rephrasing the stored row's wording", () => {
    expect(
      unreadableLines(
        [
          {
            section: 'captures',
            index: 2,
            reason: { kind: 'invalid', detail: 'A stored capture holds an unknown origin: odd' },
          },
          {
            section: 'books',
            index: 0,
            reason: { kind: 'invalid', detail: 'A stored book lacks its title' },
          },
          { section: 'tags', index: 4, reason: { kind: 'repeated', id: 't' } },
          { section: 'captures', index: 9, reason: { kind: 'unknown-book', bookKey: 'book-7' } },
        ],
        0,
      ),
    ).toEqual([
      'Capture 3 holds an unknown origin: odd.',
      'Book 1 lacks its title.',
      'Tag 5 repeats an earlier entry.',
      'Capture 10 names a book the file does not hold.',
    ]);
  });

  it('adds a line for tags named on captures but missing from the file', () => {
    expect(unreadableLines([], 2)).toEqual([
      '2 tags named on captures are missing from the file and left off.',
    ]);
  });
});

describe('importedNotes', () => {
  it('names each count that is not zero', () => {
    expect(importedNotes({ added: 3, updated: 1, kept: 2, held: 1, tagsCreated: 1 })).toEqual([
      'Added 3 captures.',
      'Updated 1 capture.',
      "Kept this device's version of 2 captures.",
      '1 capture waits in Removed books until you upload the book.',
      'Created 1 tag.',
    ]);
  });
});

describe('importStatus', () => {
  it('shows nothing while reading, previewing or importing', () => {
    expect(importStatus({ kind: 'reading' })).toBeNull();
    expect(importStatus({ kind: 'importing' })).toBeNull();
  });

  it('reports a file that is not an export', () => {
    expect(importStatus({ kind: 'not-an-export' })?.message).toBe(
      'This file is not a captures export.',
    );
  });

  it('asks for an app update for a newer file', () => {
    expect(importStatus({ kind: 'newer-version', version: 2 })?.message).toBe(
      'This file comes from a newer version of the app. Update the app, then import it again.',
    );
  });

  it('warns when the browser blocks local storage', () => {
    expect(importStatus({ kind: 'storage-unavailable' })).toMatchObject({ variant: 'warning' });
  });

  it('reports a finished import with its counts', () => {
    expect(
      importStatus({
        kind: 'imported',
        counts: { added: 2, updated: 0, kept: 0, held: 0, tagsCreated: 0 },
      }),
    ).toEqual({ variant: 'success', message: 'Import finished.', notes: ['Added 2 captures.'] });
  });

  it('says nothing changed when the import wrote nothing', () => {
    expect(
      importStatus({
        kind: 'imported',
        counts: { added: 0, updated: 0, kept: 1, held: 0, tagsCreated: 0 },
      })?.notes,
    ).toEqual(["Kept this device's version of 1 capture."]);
    expect(
      importStatus({
        kind: 'imported',
        counts: { added: 0, updated: 0, kept: 0, held: 0, tagsCreated: 0 },
      })?.message,
    ).toBe('Import finished. Nothing changed.');
  });
});

describe('versionLabel', () => {
  const format = (at: number) => `t${at}`;

  it('labels an edited capture with its edit date', () => {
    expect(versionLabel({ ...CAPTURE, editedAt: 300 }, format)).toBe('Edited t300');
  });

  it('labels a capture never edited with its capture date', () => {
    expect(versionLabel(CAPTURE, format)).toBe('Captured t100');
  });
});
