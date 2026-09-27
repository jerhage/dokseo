import { describe, expect, it } from 'vitest';
import { paletteInvite, paletteNote, paletteNothing, resultCount } from './palette-copy';
import type { PaletteNoteInput } from './palette-copy';

describe('paletteInvite', () => {
  it('invites a tag name under the tags filter in either scope and room', () => {
    expect(paletteInvite('tags', 'all', 'wide')).toBe('Find a tag');
    expect(paletteInvite('tags', 'book', 'wide')).toBe('Find a tag');
    expect(paletteInvite('tags', 'all', 'narrow')).toBe('Find a tag');
  });

  it('offers titles only across every upload', () => {
    expect(paletteInvite('everything', 'all', 'wide')).toBe('Find in titles, text, tags and notes');
    expect(paletteInvite('everything', 'book', 'wide')).toBe('Find in text, tags and notes');
  });

  it('shortens the invitation on a narrow screen and still names titles only across every book', () => {
    expect(paletteInvite('everything', 'all', 'narrow')).toBe('Titles, text, tags, notes');
    expect(paletteInvite('everything', 'book', 'narrow')).toBe('Text, tags, notes');
  });
});

describe('paletteNothing', () => {
  it('names the tag under the tags filter in either scope', () => {
    expect(paletteNothing('tags', 'all')).toBe('No capture carries a tag of that name.');
    expect(paletteNothing('tags', 'book')).toBe('No capture carries a tag of that name.');
  });

  it('mentions titles only across every upload', () => {
    expect(paletteNothing('everything', 'all')).toBe('No title or capture holds that text.');
    expect(paletteNothing('everything', 'book')).toBe('No capture holds that text.');
  });
});

describe('paletteNote', () => {
  const TYPED: PaletteNoteInput = {
    status: 'ready',
    query: '鍵',
    rows: 0,
    filter: 'everything',
    scope: 'book',
  };

  it('reports captures that could not be read instead of saying nothing matched', () => {
    expect(paletteNote({ ...TYPED, status: 'failed' })).toEqual({ kind: 'unread' });
  });

  it('reports captures that could not be read before anything is typed', () => {
    expect(paletteNote({ ...TYPED, status: 'failed', query: '' })).toEqual({ kind: 'unread' });
  });

  it('reports captures that could not be read while titles still match', () => {
    expect(paletteNote({ ...TYPED, status: 'failed', rows: 2 })).toEqual({ kind: 'unread' });
  });

  it('says nothing matched once the captures were read', () => {
    expect(paletteNote(TYPED)).toEqual({
      kind: 'nothing',
      message: 'No capture holds that text.',
    });
  });

  it('words the empty result for the filter and scope', () => {
    expect(paletteNote({ ...TYPED, filter: 'tags', scope: 'all' })).toEqual({
      kind: 'nothing',
      message: 'No capture carries a tag of that name.',
    });
  });

  it('shows no note before anything is typed', () => {
    expect(paletteNote({ ...TYPED, query: '  ' })).toEqual({ kind: 'none' });
  });

  it('shows no note while results are listed', () => {
    expect(paletteNote({ ...TYPED, rows: 3 })).toEqual({ kind: 'none' });
  });
});

describe('resultCount', () => {
  it('counts one result in the singular and any other in the plural', () => {
    expect(resultCount(0)).toBe('0 results');
    expect(resultCount(1)).toBe('1 result');
    expect(resultCount(2)).toBe('2 results');
  });
});
