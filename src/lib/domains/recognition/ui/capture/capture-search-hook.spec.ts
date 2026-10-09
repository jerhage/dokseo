import { describe, expect, it } from 'vitest';
import { createCaptureSearch } from './capture-search.svelte';

describe('createCaptureSearch', () => {
  it('searches nothing while the query is empty', () => {
    const search = createCaptureSearch();

    expect([search.query, search.wanted, search.searching]).toEqual(['', '', false]);
  });

  it('trims the typed query before searching', () => {
    const search = createCaptureSearch();
    search.setQuery('  ねこ  ');

    expect([search.query, search.wanted, search.searching]).toEqual(['  ねこ  ', 'ねこ', true]);
  });

  it('remembers the match it stepped to with the query it was stepped on', () => {
    const search = createCaptureSearch();
    search.setQuery('ねこ');
    search.stepTo(1);

    expect(search.stepped).toEqual({ query: 'ねこ', at: 1 });
  });

  it('records no step while nothing is searched', () => {
    const search = createCaptureSearch();
    search.stepTo(0);

    expect(search.stepped).toBeNull();
  });
});
