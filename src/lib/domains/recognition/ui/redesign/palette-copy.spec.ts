import { describe, expect, it } from 'vitest';
import { paletteInvite, paletteNothing, resultCount } from './palette-copy';

describe('paletteInvite', () => {
  it('invites a tag name under the tags filter in either scope', () => {
    expect(paletteInvite('tags', 'all')).toBe('Find a tag');
    expect(paletteInvite('tags', 'book')).toBe('Find a tag');
  });

  it('offers titles only across every upload', () => {
    expect(paletteInvite('everything', 'all')).toBe('Find in titles, text, tags and notes');
    expect(paletteInvite('everything', 'book')).toBe('Find in text, tags and notes');
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

describe('resultCount', () => {
  it('counts one result in the singular and any other in the plural', () => {
    expect(resultCount(0)).toBe('0 results');
    expect(resultCount(1)).toBe('1 result');
    expect(resultCount(2)).toBe('2 results');
  });
});
