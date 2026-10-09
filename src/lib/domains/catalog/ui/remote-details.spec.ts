import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { remoteItem } from '../domain/remote-item';
import type { BookOriginLink } from '../domain/remote-item';
import { publication } from './catalog-ui-fixtures';
import { openedPublication } from './remote-details';
import { publicationFacts, summaryLines } from './publication-facts';
import type { ListedPublication } from './selection-rules';

function listed(entryId: string, link: BookOriginLink | null = null): ListedPublication {
  const entry = publication(entryId, { summary: 'One line\nAnother line' });
  return {
    publication: entry,
    feedPosition: 0,
    item: remoteItem(entry, link, { kind: 'idle' }),
  };
}

const cover = (entryId: string) => `blob:${entryId}`;

describe('openedPublication', () => {
  it('shows nothing until an entry is opened', () => {
    expect(openedPublication([listed('a')], null, cover)).toBeNull();
  });

  it('shows nothing for an entry the feed does not list', () => {
    expect(openedPublication([listed('a')], 'z', cover)).toBeNull();
  });

  it('carries the facts, the summary lines and the cover of the opened entry', () => {
    const book = listed('a');

    const opened = openedPublication([listed('b'), book], 'a', cover);

    expect(opened?.publication).toBe(book.publication);
    expect(opened?.cover).toBe('blob:a');
    expect(opened?.facts).toEqual(publicationFacts(book.publication));
    expect(opened?.summary).toEqual(summaryLines(book.publication.summary));
  });

  it('reports a held publication as held', () => {
    const held = listed('a', { bookId: bookId('b'), updated: '2026-08-01T00:00:00Z' });

    expect(openedPublication([held], 'a', cover)?.item.kind).toBe('held');
  });
});
