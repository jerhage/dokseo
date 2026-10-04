import { describe, expect, it } from 'vitest';
import { buildCapturesFile } from '$lib/domains/storage/use-cases/build-captures-file';
import { readCapturesFile } from '$lib/domains/storage/use-cases/read-captures-file';
import { brokenText } from './file-breakage';
import type { EntryBreak, FileBreak } from './file-breakage';
import { SAMPLE_HOLDINGS, fileContents } from './sample-holdings';

const FILE = buildCapturesFile(fileContents(SAMPLE_HOLDINGS, 1, '1.0.0')).file;

function readWith(whole: FileBreak, entries: readonly EntryBreak[] = []) {
  return readCapturesFile(brokenText(FILE, whole, new Set(entries)));
}

function readEntries(whole: FileBreak, entries: readonly EntryBreak[]) {
  const read = readWith(whole, entries);
  if (read.kind !== 'read') throw new Error(read.kind);
  return read;
}

describe('brokenText', () => {
  it('reads every entry of the whole file', () => {
    const read = readEntries('none', []);

    expect([read.books.length, read.tags.length, read.captures.length]).toEqual([2, 2, 3]);
    expect(read.unreadable).toEqual([]);
  });

  it.each([
    ['not-json', { kind: 'not-an-export' }],
    ['other-format', { kind: 'not-an-export' }],
    ['newer-version', { kind: 'newer-version', version: 2 }],
    ['version-text', { kind: 'not-an-export' }],
    ['no-list', { kind: 'not-an-export' }],
  ] as const)('refuses the whole file when it is broken by %s', (whole, outcome) => {
    expect(readWith(whole)).toEqual(outcome);
  });

  it('skips each broken entry and reads the rest', () => {
    const read = readEntries('none', ['capture-text', 'tag-colour', 'repeated-capture']);

    expect(read.unreadable).toEqual([
      {
        section: 'tags',
        index: 1,
        reason: { kind: 'invalid', detail: 'A stored tag holds an unknown colour: purple' },
      },
      {
        section: 'captures',
        index: 1,
        reason: { kind: 'invalid', detail: 'A stored capture lacks its text' },
      },
      { section: 'captures', index: 3, reason: { kind: 'repeated', id: FILE.captures[0]?.id } },
    ]);
    expect(read.captures.map((entry) => entry.capture.text)).toEqual(['港の灯り', '紙の提灯']);
    expect(read.droppedTags).toHaveLength(1);
  });

  it("sets aside a book's captures when the book entry is unreadable", () => {
    const read = readEntries('none', ['book-language']);

    expect(read.unreadable.map((entry) => [entry.section, entry.index, entry.reason.kind])).toEqual(
      [
        ['books', 1, 'invalid'],
        ['captures', 2, 'unknown-book'],
      ],
    );
  });

  it('drops a tag the file lacks and keeps the capture', () => {
    const read = readEntries('none', ['missing-tag']);

    expect(read.captures).toHaveLength(3);
    expect(read.droppedTags).toHaveLength(1);
    expect(read.unreadable).toEqual([]);
  });

  it('refuses an unknown origin and an unknown book key', () => {
    const read = readEntries('none', ['capture-origin', 'unknown-book-key']);

    expect(read.unreadable.map((entry) => [entry.index, entry.reason.kind])).toEqual([
      [0, 'invalid'],
      [2, 'unknown-book'],
    ]);
  });

  it('refuses a rect past the page edge and a hash that is not a partial MD5', () => {
    const read = readEntries('none', ['capture-rect', 'book-hash']);

    expect(read.unreadable.map((entry) => [entry.section, entry.index, entry.reason.kind])).toEqual(
      [
        ['books', 0, 'invalid'],
        ['captures', 0, 'invalid'],
        ['captures', 1, 'unknown-book'],
      ],
    );
    expect(read.captures.map((entry) => entry.capture.text)).toEqual(['紙の提灯']);
  });
});
