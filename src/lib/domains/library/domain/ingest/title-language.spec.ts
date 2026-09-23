import { describe, expect, it } from 'vitest';
import { languageOfTitle } from './title-language';

describe('languageOfTitle', () => {
  it('reads hangul as Korean', () => {
    expect(languageOfTitle('나 혼자만 레벨업')).toBe('ko');
  });

  it('reads a lone hangul jamo as Korean', () => {
    expect(languageOfTitle('ㄱ 01')).toBe('ko');
  });

  it('reads hiragana as Japanese', () => {
    expect(languageOfTitle('よつばと！')).toBe('ja');
  });

  it('reads katakana as Japanese', () => {
    expect(languageOfTitle('ベルセルク 第01巻')).toBe('ja');
  });

  it('says nothing about a title of kanji alone, which Korean also writes', () => {
    expect(languageOfTitle('進撃')).toBeNull();
  });

  it('says nothing about a Latin title, however the pages read', () => {
    expect(languageOfTitle('One Piece v01')).toBeNull();
  });

  it('says nothing about a romanised Japanese title, which Latin letters cannot tell from English', () => {
    expect(languageOfTitle('Yotsuba&! 1')).toBeNull();
  });

  it('says nothing about an empty title', () => {
    expect(languageOfTitle('')).toBeNull();
  });

  it('prefers hangul when a title carries both scripts', () => {
    expect(languageOfTitle('신의 탑 カラー版')).toBe('ko');
  });

  it('reads a script buried among Latin and digits', () => {
    expect(languageOfTitle('[Raw] 転生したら (2024) v03')).toBe('ja');
  });
});
