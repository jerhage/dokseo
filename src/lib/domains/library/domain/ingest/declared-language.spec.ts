import { describe, expect, it } from 'vitest';
import { languageDeclared } from './declared-language';

describe('languageDeclared', () => {
  it('reads a bare tag the app understands', () => {
    expect(languageDeclared('ja')).toBe('ja');
    expect(languageDeclared('ko')).toBe('ko');
    expect(languageDeclared('en')).toBe('en');
  });

  it('reads a region-qualified tag by its primary subtag', () => {
    expect(languageDeclared('ja-JP')).toBe('ja');
    expect(languageDeclared('ko-KR')).toBe('ko');
    expect(languageDeclared('en-GB')).toBe('en');
  });

  it.each([
    ['written in capitals', 'JA'],
    ['padded with the whitespace an XML element carries', '\n      ja-JP\n    '],
    ['joined with an underscore, which some publishers write', 'ja_JP'],
  ])('reads a tag %s', (_, tag) => {
    expect(languageDeclared(tag)).toBe('ja');
  });

  it('says nothing about a language this app does not read, or a three-letter code', () => {
    expect(languageDeclared('zh-Hans')).toBeNull();
    expect(languageDeclared('fr')).toBeNull();
    expect(languageDeclared('jpn')).toBeNull();
  });

  it('says nothing about an absent, empty or nonsense tag', () => {
    expect(languageDeclared(null)).toBeNull();
    expect(languageDeclared('')).toBeNull();
    expect(languageDeclared('   ')).toBeNull();
  });
});
