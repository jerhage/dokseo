import { describe, expect, it } from 'vitest';
import { HOME_SEARCH } from '../domain/catalog-feed-fixtures';
import type { Place } from './navigation';
import { fieldValue, searchMove, searchOffer, searchPlaceholder } from './catalog-search';

const ROOT = { kind: 'root' } as const;
const OFFERED = { kind: 'offered', search: HOME_SEARCH } as const;
const MOON = { kind: 'search', search: HOME_SEARCH, query: 'moon' } as const;

function place(id: string, parent: string | null): Place {
  return { id, tab: 'home', parent, location: ROOT, feedId: '' };
}

describe('searchPlaceholder', () => {
  it('names the catalog, and says when it has no search', () => {
    expect(searchPlaceholder('Calibre', OFFERED)).toBe('Search Calibre');
    expect(searchPlaceholder('Calibre', { kind: 'unknown' })).toBe('Search Calibre');
    expect(searchPlaceholder('Calibre', { kind: 'absent' })).toBe('Calibre has no search');
  });
});

describe('searchMove', () => {
  it('searches the offered template for a new query', () => {
    expect(searchMove('moon', ROOT, OFFERED)).toEqual({
      kind: 'search',
      search: HOME_SEARCH,
      query: 'moon',
    });
  });

  it('leaves a search when the query is empty and ignores an empty query elsewhere', () => {
    expect(searchMove('  ', MOON, OFFERED)).toEqual({ kind: 'leave' });
    expect(searchMove('', ROOT, OFFERED)).toEqual({ kind: 'ignore' });
  });

  it('ignores a query when nothing offers a search', () => {
    expect(searchMove('moon', ROOT, { kind: 'absent' })).toEqual({ kind: 'ignore' });
    expect(searchMove('moon', ROOT, { kind: 'unknown' })).toEqual({ kind: 'ignore' });
  });

  it('ignores the query the search already shows', () => {
    expect(searchMove(' moon ', MOON, OFFERED)).toEqual({ kind: 'ignore' });
  });
});

describe('searchOffer', () => {
  const chain = [place('feed', 'root'), place('root', null)];

  it('stays unknown until the shown feed has reported', () => {
    expect(searchOffer(chain, new Map())).toEqual({ kind: 'unknown' });
  });

  it('takes the search of the shown feed first', () => {
    const readings = new Map([['feed', { kind: 'ready', search: HOME_SEARCH } as const]]);

    expect(searchOffer(chain, readings)).toEqual(OFFERED);
  });

  it('falls back to the search of the root feed', () => {
    const readings = new Map([
      ['feed', { kind: 'ready', search: null } as const],
      ['root', { kind: 'ready', search: HOME_SEARCH } as const],
    ]);

    expect(searchOffer(chain, readings)).toEqual(OFFERED);
  });

  it('counts a failed feed as settled with the root search', () => {
    const readings = new Map([
      ['feed', { kind: 'failed' } as const],
      ['root', { kind: 'ready', search: null } as const],
    ]);

    expect(searchOffer(chain, readings)).toEqual({ kind: 'absent' });
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
