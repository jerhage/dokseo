import { describe, expect, it } from 'vitest';
import { languageOfTitle } from './title-language';

describe('languageOfTitle', () => {
  it.each([
    ['나 혼자만 레벨업', 'ko'],
    ['ㄱ 01', 'ko'],
    ['よつばと！', 'ja'],
    ['ベルセルク 第01巻', 'ja'],
  ])('reads the script of %s as %s', (title, language) => {
    expect(languageOfTitle(title)).toBe(language);
  });

  it('says nothing about a title of kanji alone, which Korean also writes', () => {
    expect(languageOfTitle('進撃')).toBeNull();
  });

  it.each([
    ['a Latin title, however the pages read', 'One Piece v01'],
    ['a romanised Japanese title, which Latin letters cannot tell from English', 'Yotsuba&! 1'],
    ['an empty title', ''],
  ])('says nothing about %s', (_, title) => {
    expect(languageOfTitle(title)).toBeNull();
  });

  it('prefers hangul when a title carries both scripts', () => {
    expect(languageOfTitle('신의 탑 カラー版')).toBe('ko');
  });

  it('reads a script buried among Latin and digits', () => {
    expect(languageOfTitle('[Raw] 転生したら (2024) v03')).toBe('ja');
  });
});
