import { describe, expect, it } from 'vitest';
import { codeUnitOrder, naturalOrder, sameOrNot, searchFold } from './dokseo-text';

describe('the same-or-not comparison', () => {
  it('reports half-width katakana and hiragana as one tag name and unequal as raw strings', () => {
    const result = sameOrNot('ﾀｸﾞ', 'たぐ');

    expect(result.plain.map((one) => one.equal)).toEqual([false, false, false]);
    expect(result.dokseo.equal).toBe(true);
  });

  it('reports names that differ only in case and spaces as one tag name', () => {
    expect(sameOrNot('  my   words ', 'My words').dokseo.equal).toBe(true);
  });

  it('labels each collator row with the Japanese locale', () => {
    expect(sameOrNot('a', 'b').collator[0]?.label).toBe(
      "Intl.Collator('ja', { sensitivity: 'base' })",
    );
  });
});

describe('the search fold', () => {
  it('finds a katakana query in hiragana text and highlights the original characters', () => {
    const fold = searchFold('ねこがすき', 'ネコ');

    expect(fold.found).toBe(true);
    expect(fold.foldedQuery).toBe('ねこ');
    expect(fold.segments).toEqual([
      { text: 'ねこ', matched: true },
      { text: 'がすき', matched: false },
    ]);
  });

  it('finds a full-width query in half-width text', () => {
    const fold = searchFold('ｶﾞｲﾄﾞ 1', 'ガイド');

    expect(fold.foldedText).toBe('がいど 1');
    expect(fold.segments[0]).toEqual({ text: 'ｶﾞｲﾄﾞ', matched: true });
  });

  it('joins a spacing voiced mark onto the kana before it', () => {
    const fold = searchFold('か゛っこいい', 'がっこ');

    expect(fold.foldedText).toBe('がっこいい');
    expect(fold.segments[0]).toEqual({ text: 'か゛っこ', matched: true });
  });

  it('highlights a whole square word when the search matches what it expands to', () => {
    const fold = searchFold('５㌔走る', 'キロ');

    expect(fold.foldedText).toBe('5きろ走る');
    expect(fold.segments).toEqual([
      { text: '５', matched: false },
      { text: '㌔', matched: true },
      { text: '走る', matched: false },
    ]);
  });
});

describe('the file name orders', () => {
  it('puts page 2 before page 10 in natural order and after it by code units', () => {
    const names = ['page10.jpg', 'page2.jpg'];

    expect(naturalOrder(names)).toEqual(['page2.jpg', 'page10.jpg']);
    expect(codeUnitOrder(names)).toEqual(['page10.jpg', 'page2.jpg']);
  });
});
