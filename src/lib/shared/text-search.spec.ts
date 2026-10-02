import { describe, expect, it } from 'vitest';
import { at } from '$lib/shared/testing/at';
import { foldForSearch, matchesQuery, segmentsOf, textMatches } from './text-search';

describe('foldForSearch', () => {
  it('folds a full-width question mark onto the half-width form', () => {
    expect(foldForSearch('えっ？').text).toBe('えっ?');
  });

  it('folds full-width digits and letters onto their half-width forms', () => {
    expect(foldForSearch('ＡＢ１２').text).toBe('ab12');
  });

  it('folds half-width katakana onto hiragana', () => {
    expect(foldForSearch('ｱｲｳ').text).toBe('あいう');
  });

  it.each([
    ['ｶﾞ', 'が'],
    ['ﾊﾟ', 'ぱ'],
  ])(
    'folds the half-width voiced or semi-voiced kana %s onto one precomposed %s',
    (half, precomposed) => {
      const folded = foldForSearch(half);

      expect(folded.text).toBe(precomposed);
      expect(folded.origins).toEqual([0]);
    },
  );

  it('folds a standalone voiced mark onto the combining mark without a space', () => {
    expect(foldForSearch('か゛').text).toBe('が');
  });

  it.each([
    ['カタカナ', 'かたかな'],
    ['ァィゥェォッャュョヮヵヶ', 'ぁぃぅぇぉっゃゅょゎゕゖ'],
  ])('folds katakana %s onto hiragana, small kana included', (katakana, hiragana) => {
    expect(foldForSearch(katakana).text).toBe(hiragana);
  });

  it.each([
    ['the prolonged sound mark', 'ラーメン', 'らーめん'],
    ['the katakana middle dot and iteration marks', '・ヽヾ', '・ヽヾ'],
    ['hiragana', 'こっちに来て', 'こっちに来て'],
  ])('leaves %s unshifted', (_name, text, folded) => {
    expect(foldForSearch(text).text).toBe(folded);
  });

  it('maps every folded unit back to the character it came from', () => {
    const folded = foldForSearch('ｱ海');

    expect(folded.text).toBe('あ海');
    expect(folded.origins).toEqual([0, 1]);
  });
});

describe('decomposed Hangul', () => {
  const TITLE = '나 혼자만 레벨업 1권';

  it.each(['나', '레벨업'])('finds %s anywhere in a title macOS stored decomposed', (query) => {
    expect(matchesQuery(TITLE.normalize('NFD'), query)).toBe(true);
  });

  it('finds a composed syllable from a decomposed query, both ways round', () => {
    expect(matchesQuery(TITLE, '나'.normalize('NFD'))).toBe(true);
  });

  it('highlights the whole syllable, not half of its jamo', () => {
    const decomposed = TITLE.normalize('NFD');

    expect(textMatches(decomposed, '나')).toEqual([{ start: 0, end: 2 }]);
    expect(decomposed.slice(0, 2).normalize('NFC')).toBe('나');
  });

  it('refuses a syllable the title does not hold', () => {
    expect(matchesQuery(TITLE.normalize('NFD'), '용')).toBe(false);
  });
});

describe('textMatches', () => {
  it.each([
    ['katakana text with a hiragana query', 'コーヒー', 'こーひー'],
    ['hiragana text with a katakana query', 'ありがとう', 'アリガトウ'],
    ['a full-width question mark with a half-width query', 'えっ？', '?'],
    ['a half-width digit with a full-width query', '3人', '３'],
    ['a precomposed voiced kana with a half-width query', 'ガキ', 'ｶﾞ'],
  ])('matches %s', (_name, text, query) => {
    expect(matchesQuery(text, query)).toBe(true);
  });

  it('rejects text that does not hold the query', () => {
    expect(matchesQuery('こっちに来て', '海')).toBe(false);
  });

  it('reports the range the match occupies in the stored text', () => {
    const matches = textMatches('こっちに来て', 'に');

    expect(matches).toEqual([{ start: 3, end: 4 }]);
  });

  it('reports the range in the stored text when folding changed its length', () => {
    const matches = textMatches('もうｶﾞマンできない', 'がまん');

    expect(at(matches, 0)).toEqual({ start: 2, end: 6 });
  });

  it('reports every occurrence', () => {
    expect(textMatches('ここ、あそこ、ここ', 'ここ')).toEqual([
      { start: 0, end: 2 },
      { start: 7, end: 9 },
    ]);
  });

  it.each([
    ['a blank query', 'こっちに来て', '   '],
    ['empty text', '', 'あ'],
  ])('reports nothing for %s', (_name, text, query) => {
    expect(textMatches(text, query)).toEqual([]);
  });
});

describe('segmentsOf', () => {
  it('splits the text around the matched range', () => {
    expect(segmentsOf('こっちに来て', textMatches('こっちに来て', 'に'))).toEqual([
      { text: 'こっち', matched: false },
      { text: 'に', matched: true },
      { text: '来て', matched: false },
    ]);
  });

  it('keeps the whole text unmatched when nothing matched', () => {
    expect(segmentsOf('こっちに来て', [])).toEqual([{ text: 'こっちに来て', matched: false }]);
  });

  it('marks a match that runs to the end without a trailing segment', () => {
    expect(segmentsOf('こっちに来て', textMatches('こっちに来て', '来て'))).toEqual([
      { text: 'こっちに', matched: false },
      { text: '来て', matched: true },
    ]);
  });
});
