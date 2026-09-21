import { describe, expect, it } from 'vitest';
import { readTagName, TAG_PARAMETER, TAGS_PLACE, tagsHref } from './tag-location';

describe('tagsHref', () => {
  it('names the tag screen alone when no tag is wanted', () => {
    expect(tagsHref(null)).toBe(TAGS_PLACE);
  });

  it('names the tag screen alone when the name is blank', () => {
    expect(tagsHref('   ')).toBe(TAGS_PLACE);
  });

  it('carries the name in the query rather than the path', () => {
    expect(tagsHref('keigo')).toBe('/tags?tag=keigo');
  });

  it('trims the name it carries', () => {
    expect(tagsHref('  keigo  ')).toBe('/tags?tag=keigo');
  });

  it('survives a round trip through a name of punctuation and spaces', () => {
    const name = 'a&b=c d?e#f';
    const url = new URL(tagsHref(name), 'https://example.test');

    expect(readTagName(url.searchParams.get(TAG_PARAMETER))).toBe(name);
  });

  it('survives a round trip through a Japanese name', () => {
    const url = new URL(tagsHref('文法'), 'https://example.test');

    expect(readTagName(url.searchParams.get(TAG_PARAMETER))).toBe('文法');
  });
});

describe('readTagName', () => {
  it('reads nothing from a missing parameter', () => {
    expect(readTagName(null)).toBeNull();
    expect(readTagName(undefined)).toBeNull();
  });

  it('reads nothing from a blank parameter', () => {
    expect(readTagName('   ')).toBeNull();
  });

  it('trims what it reads', () => {
    expect(readTagName('  keigo ')).toBe('keigo');
  });
});
