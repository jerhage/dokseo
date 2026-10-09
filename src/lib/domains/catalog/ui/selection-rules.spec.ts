import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { remoteItem } from '../domain/remote-item';
import type { BookOriginLink, DownloadState } from '../domain/remote-item';
import { publication } from './catalog-ui-fixtures';
import { chosenOf, entryIdsOf, isSelectable, selectableOf } from './selection-rules';
import type { ListedPublication } from './selection-rules';

const IDLE: DownloadState = { kind: 'idle' };

function listed(
  entryId: string,
  link: BookOriginLink | null = null,
  state: DownloadState = IDLE,
  unsupported = false,
): ListedPublication {
  const entry = publication(entryId, unsupported ? { acquisition: null } : {});
  return { publication: entry, feedPosition: 0, item: remoteItem(entry, link, state) };
}

const HELD: BookOriginLink = { bookId: bookId('b'), updated: '2026-08-01T00:00:00Z' };

describe('isSelectable', () => {
  it('accepts a book that can be downloaded and one whose download failed', () => {
    expect(isSelectable(listed('a').item)).toBe(true);
    expect(isSelectable(listed('a', null, { kind: 'failed', reason: 'no' }).item)).toBe(true);
  });

  it('refuses a book that is held, running or of an unsupported format', () => {
    expect(isSelectable(listed('a', HELD).item)).toBe(false);
    expect(isSelectable(listed('a', null, { kind: 'running', progress: null }).item)).toBe(false);
    expect(isSelectable(listed('a', null, IDLE, true).item)).toBe(false);
  });
});

describe('selectableOf', () => {
  it('keeps the books that can still be downloaded, in feed order', () => {
    const books = [listed('a'), listed('b', HELD), listed('c')];

    expect(entryIdsOf(selectableOf(books))).toEqual(['a', 'c']);
  });
});

describe('chosenOf', () => {
  it('keeps the chosen books that are still selectable', () => {
    const books = [listed('a'), listed('b', HELD), listed('c')];

    expect(entryIdsOf(chosenOf(books, new Set(['b', 'c'])))).toEqual(['c']);
  });

  it('answers nothing when nothing is chosen', () => {
    expect(chosenOf([listed('a')], new Set())).toEqual([]);
  });
});
