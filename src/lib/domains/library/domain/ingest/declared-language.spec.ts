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

  it('reads a tag a publisher wrote in capitals', () => {
    expect(languageDeclared('JA')).toBe('ja');
  });

  it('reads a tag padded with the whitespace an XML element carries', () => {
    expect(languageDeclared('\n      ja-JP\n    ')).toBe('ja');
  });

  it('reads a tag joined with an underscore, which some publishers write', () => {
    expect(languageDeclared('ja_JP')).toBe('ja');
  });

  it('says nothing about a language this app does not read', () => {
    expect(languageDeclared('zh-Hans')).toBeNull();
    expect(languageDeclared('fr')).toBeNull();
  });

  it('says nothing about a three-letter code, which is not what BCP 47 asks for', () => {
    expect(languageDeclared('jpn')).toBeNull();
  });

  it('says nothing about an absent, empty or nonsense tag', () => {
    expect(languageDeclared(null)).toBeNull();
    expect(languageDeclared('')).toBeNull();
    expect(languageDeclared('   ')).toBeNull();
  });
});
