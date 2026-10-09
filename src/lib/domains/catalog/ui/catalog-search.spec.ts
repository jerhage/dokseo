import { describe, expect, it } from 'vitest';
import { HOME_SEARCH } from '../domain/catalog-feed-fixtures';
import type { Place } from './navigation';
import {
  fieldValue,
  searchAvailability,
  searchMove,
  searchOffer,
  searchPlaceholder,
} from './catalog-search';

const ROOT = { kind: 'root' } as const;
const MOON = { kind: 'search', search: HOME_SEARCH, query: 'moon' } as const;

function place(id: string, parent: string | null): Place {
  return { id, tab: 'home', parent, location: ROOT, feedId: '' };
}

describe('searchPlaceholder', () => {
  it('names the catalog, and says when it has no search', () => {
    expect(searchPlaceholder('Calibre', 'offered')).toBe('Search Calibre');
    expect(searchPlaceholder('Calibre', 'unknown')).toBe('Search Calibre');
    expect(searchPlaceholder('Calibre', 'absent')).toBe('Calibre has no search');
  });
});

describe('searchAvailability', () => {
  it('reports absent only once the feed is read and offers no template', () => {
    expect(searchAvailability(false, null)).toBe('unknown');
    expect(searchAvailability(true, null)).toBe('absent');
    expect(searchAvailability(true, HOME_SEARCH)).toBe('offered');
  });
});

describe('searchMove', () => {
  it('searches the offered template for a new query', () => {
    expect(searchMove('moon', ROOT, HOME_SEARCH)).toEqual({
      kind: 'search',
      search: HOME_SEARCH,
      query: 'moon',
    });
  });

  it('leaves a search when the query is empty and ignores an empty query elsewhere', () => {
    expect(searchMove('  ', MOON, HOME_SEARCH)).toEqual({ kind: 'leave' });
    expect(searchMove('', ROOT, HOME_SEARCH)).toEqual({ kind: 'ignore' });
  });

  it('ignores a query when nothing offers a search', () => {
    expect(searchMove('moon', ROOT, null)).toEqual({ kind: 'ignore' });
  });

  it('ignores the query the search already shows', () => {
    expect(searchMove(' moon ', MOON, HOME_SEARCH)).toEqual({ kind: 'ignore' });
  });
});

describe('searchOffer', () => {
  const chain = [place('feed', 'root'), place('root', null)];

  it('stays unsettled until the shown feed has reported', () => {
    expect(searchOffer(chain, new Map())).toEqual({ settled: false, search: null });
  });

  it('takes the search of the shown feed first', () => {
    const readings = new Map([['feed', { kind: 'ready', search: HOME_SEARCH } as const]]);

    expect(searchOffer(chain, readings)).toEqual({ settled: true, search: HOME_SEARCH });
  });

  it('falls back to the search of the root feed', () => {
    const readings = new Map([
      ['feed', { kind: 'ready', search: null } as const],
      ['root', { kind: 'ready', search: HOME_SEARCH } as const],
    ]);

    expect(searchOffer(chain, readings)).toEqual({ settled: true, search: HOME_SEARCH });
  });

  it('counts a failed feed as settled with the root search', () => {
    const readings = new Map([
      ['feed', { kind: 'failed' } as const],
      ['root', { kind: 'ready', search: null } as const],
    ]);

    expect(searchOffer(chain, readings)).toEqual({ settled: true, search: null });
  });
});

describe('fieldValue', () => {
  it('shows what was typed on the entry it was typed on', () => {
    expect(fieldValue({ text: 'moo ', entry: 'e1' }, 'e1', ROOT)).toBe('moo ');
  });

  it('shows the query of a search the typed text produced, whitespace kept', () => {
    expect(fieldValue({ text: 'moon ', entry: 'e1' }, 'e2', MOON)).toBe('moon ');
  });

  it('shows the query of the search when the typed text belongs elsewhere', () => {
    expect(fieldValue({ text: 'star', entry: 'e1' }, 'e2', MOON)).toBe('moon');
  });

  it('shows nothing for a feed the typed text no longer belongs to', () => {
    expect(fieldValue({ text: 'moon', entry: 'e2' }, 'e1', ROOT)).toBe('');
    expect(fieldValue(null, 'e1', ROOT)).toBe('');
  });
});
