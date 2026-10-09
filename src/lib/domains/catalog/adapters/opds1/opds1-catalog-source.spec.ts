import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import { CALIBRE_ROOT, HTML_PAGE } from './opds1-fixtures';
import type { FeedPlacement } from '../../domain/catalog-source';
import { HttpCatalogClient } from '../http-catalog-client';
import { Opds1CatalogSource, searchAddress } from './opds1-catalog-source';

const PLACEMENT: FeedPlacement = { catalogId: catalogId('home'), path: [] };
const NONE = { kind: 'none' } as const;

function sourceAnswering(text: string) {
  const requests: string[] = [];
  const http = new HttpCatalogClient(
    (url) => {
      requests.push(url);
      return Promise.resolve(new Response(text));
    },
    () => true,
  );
  return { source: new Opds1CatalogSource(http), requests };
}

describe('searchAddress', () => {
  it('encodes the query into the template', () => {
    expect(
      searchAddress({ handle: 'https://x.test/search/{searchTerms}?lib=a' }, 'star & voyage'),
    ).toEqual({ handle: 'https://x.test/search/star%20%26%20voyage?lib=a' });
  });

  it('encodes a non-ASCII query', () => {
    expect(searchAddress({ handle: 'https://x.test/s/{searchTerms}' }, '星')).toEqual({
      handle: 'https://x.test/s/%E6%98%9F',
    });
  });

  it('fills the placeholder wherever it appears', () => {
    expect(
      searchAddress({ handle: 'https://x.test/s?q={searchTerms}&t={searchTerms}' }, 'a b'),
    ).toEqual({ handle: 'https://x.test/s?q=a%20b&t=a%20b' });
  });

  it('trims the query', () => {
    expect(searchAddress({ handle: 'https://x.test/s/{searchTerms}' }, '  moon ')).toEqual({
      handle: 'https://x.test/s/moon',
    });
  });
});

describe('Opds1CatalogSource', () => {
  it('reads a feed from the address it is given', async () => {
    const { source, requests } = sourceAnswering(CALIBRE_ROOT);

    const read = await source.readFeed({ handle: 'https://home.test/opds' }, PLACEMENT, NONE);

    expect(read.kind === 'success' && read.page.kind).toBe('navigation');
    expect(read.kind === 'success' && read.page.address).toEqual({
      handle: 'https://home.test/opds',
    });
    expect(requests).toEqual(['https://home.test/opds']);
  });

  it('answers not-a-catalog for a page that is no feed', async () => {
    const { source } = sourceAnswering(HTML_PAGE);

    expect(await source.readFeed({ handle: 'https://home.test/opds' }, PLACEMENT, NONE)).toEqual({
      kind: 'not-a-catalog',
    });
  });

  it('offers the search a feed declares and reads the address it builds', async () => {
    const { source, requests } = sourceAnswering(CALIBRE_ROOT);
    const root = await source.readFeed({ handle: 'https://home.test/opds' }, PLACEMENT, NONE);
    const search = root.kind === 'success' ? root.page.search : null;
    expect(search).not.toBeNull();
    if (search === null) return;

    await source.search(search, 'star voyage', PLACEMENT, NONE);

    expect(requests.at(-1)).toBe('https://home.test/opds/search/star%20voyage?library_id=calibre');
  });
});
