import { describe, expect, it } from 'vitest';
import { at } from '$lib/shared/testing/at';
import { foldForSearch, matchesQuery, segmentsOf, textMatches } from './capture-search';

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

  it('folds a half-width voiced kana onto one precomposed character', () => {
    const folded = foldForSearch('ｶﾞ');

    expect(folded.text).toBe('が');
    expect(folded.origins).toEqual([0]);
  });

  it('folds a half-width semi-voiced kana onto one precomposed character', () => {
    expect(foldForSearch('ﾊﾟ').text).toBe('ぱ');
  });

  it('folds a standalone voiced mark onto the combining mark without a space', () => {
    expect(foldForSearch('か゛').text).toBe('が');
  });

  it('folds katakana onto hiragana', () => {
    expect(foldForSearch('カタカナ').text).toBe('かたかな');
  });

  it('folds small katakana onto small hiragana', () => {
    expect(foldForSearch('ァィゥェォッャュョヮヵヶ').text).toBe('ぁぃぅぇぉっゃゅょゎゕゖ');
  });

  it('leaves the prolonged sound mark unshifted', () => {
    expect(foldForSearch('ラーメン').text).toBe('らーめん');
  });

  it('leaves the katakana middle dot and iteration marks unshifted', () => {
    expect(foldForSearch('・ヽヾ').text).toBe('・ヽヾ');
  });

  it('leaves hiragana alone', () => {
    expect(foldForSearch('こっちに来て').text).toBe('こっちに来て');
  });

  it('maps every folded unit back to the character it came from', () => {
    const folded = foldForSearch('ｱ海');

    expect(folded.text).toBe('あ海');
    expect(folded.origins).toEqual([0, 1]);
  });
});

describe('textMatches', () => {
  it('matches katakana text with a hiragana query', () => {
    expect(matchesQuery('コーヒー', 'こーひー')).toBe(true);
  });

  it('matches hiragana text with a katakana query', () => {
    expect(matchesQuery('ありがとう', 'アリガトウ')).toBe(true);
  });

  it('matches a full-width question mark with a half-width query', () => {
    expect(matchesQuery('えっ？', '?')).toBe(true);
  });

  it('matches a half-width digit with a full-width query', () => {
    expect(matchesQuery('3人', '３')).toBe(true);
  });

  it('matches a precomposed voiced kana with a half-width query', () => {
    expect(matchesQuery('ガキ', 'ｶﾞ')).toBe(true);
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

  it('reports nothing for a blank query', () => {
    expect(textMatches('こっちに来て', '   ')).toEqual([]);
  });

  it('reports nothing for empty text', () => {
    expect(textMatches('', 'あ')).toEqual([]);
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
