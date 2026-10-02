import { describe, expect, it } from 'vitest';
import { readTagName, TAG_PARAMETER, TAGS_PLACE, tagsHref } from './tag-location';

describe('tagsHref', () => {
  it('names the tag screen alone when no tag is wanted or the name is blank', () => {
    expect(tagsHref(null)).toBe(TAGS_PLACE);
    expect(tagsHref('   ')).toBe(TAGS_PLACE);
  });

  it('carries the name in the query rather than the path', () => {
    expect(tagsHref('keigo')).toBe('/tags?tag=keigo');
  });

  it('trims the name it carries', () => {
    expect(tagsHref('  keigo  ')).toBe('/tags?tag=keigo');
  });

  it.each(['a&b=c d?e#f', '文法'])('survives a round trip through the name %s', (name) => {
    const url = new URL(tagsHref(name), 'https://example.test');

    expect(readTagName(url.searchParams.get(TAG_PARAMETER))).toBe(name);
  });
});

describe('readTagName', () => {
  it('reads nothing from a missing or blank parameter', () => {
    expect(readTagName(null)).toBeNull();
    expect(readTagName(undefined)).toBeNull();
    expect(readTagName('   ')).toBeNull();
  });

  it('trims what it reads', () => {
    expect(readTagName('  keigo ')).toBe('keigo');
  });
});
