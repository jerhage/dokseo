import { describe, expect, it } from 'vitest';
import { readFailed, readReady } from '$lib/shared/read-state';
import { searchInvite, searchNote, searchNothing, resultCount } from './search-copy';
import type { SearchNoteInput } from './search-copy';

const UNREAD = readFailed('Local storage failed: gone');

describe('searchInvite', () => {
  it('invites a tag name under the tags filter in either scope and room', () => {
    expect(searchInvite('tags', 'all', 'wide')).toBe('Find a tag');
    expect(searchInvite('tags', 'book', 'wide')).toBe('Find a tag');
    expect(searchInvite('tags', 'all', 'narrow')).toBe('Find a tag');
  });

  it('offers titles only across every upload', () => {
    expect(searchInvite('everything', 'all', 'wide')).toBe('Find in titles, text, tags and notes');
    expect(searchInvite('everything', 'book', 'wide')).toBe('Find in text, tags and notes');
  });

  it('shortens the invitation on a narrow screen and still names titles only across every book', () => {
    expect(searchInvite('everything', 'all', 'narrow')).toBe('Titles, text, tags, notes');
    expect(searchInvite('everything', 'book', 'narrow')).toBe('Text, tags, notes');
  });
});

describe('searchNothing', () => {
  it('names the tag under the tags filter in either scope', () => {
    expect(searchNothing('tags', 'all')).toBe('No capture carries a tag of that name.');
    expect(searchNothing('tags', 'book')).toBe('No capture carries a tag of that name.');
  });

  it('mentions titles only across every upload', () => {
    expect(searchNothing('everything', 'all')).toBe('No title or capture holds that text.');
    expect(searchNothing('everything', 'book')).toBe('No capture holds that text.');
  });
});

describe('searchNote', () => {
  const TYPED: SearchNoteInput = {
    read: readReady([]),
    query: '鍵',
    rows: 0,
    filter: 'everything',
    scope: 'book',
  };

  it.each([
    ['instead of saying nothing matched', {}],
    ['before anything is typed', { query: '' }],
    ['while titles still match', { rows: 2 }],
  ])('reports captures that could not be read %s', (_case, input) => {
    expect(searchNote({ ...TYPED, read: UNREAD, ...input })).toEqual({ kind: 'unread' });
  });

  it.each([
    ['everything', 'book', 'No capture holds that text.'],
    ['tags', 'all', 'No capture carries a tag of that name.'],
  ] as const)(
    'says nothing matched once the captures were read, under the %s filter in the %s scope',
    (filter, scope, message) => {
      expect(searchNote({ ...TYPED, filter, scope })).toEqual({ kind: 'nothing', message });
    },
  );

  it('shows no note before anything is typed', () => {
    expect(searchNote({ ...TYPED, query: '  ' })).toEqual({ kind: 'none' });
  });

  it('shows no note while results are listed', () => {
    expect(searchNote({ ...TYPED, rows: 3 })).toEqual({ kind: 'none' });
  });
});

describe('resultCount', () => {
  it('counts one result in the singular and any other in the plural', () => {
    expect(resultCount(0)).toBe('0 results');
    expect(resultCount(1)).toBe('1 result');
    expect(resultCount(2)).toBe('2 results');
  });
});
