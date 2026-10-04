import { describe, expect, it } from 'vitest';
import {
  bytesOf,
  codePointsOf,
  collatorComparisons,
  graphemeRows,
  graphemesOf,
  plainComparisons,
  segmentedText,
  spaceSplit,
  textCounts,
  unitsOf,
  wholeForms,
} from './unicode-text';

describe('the code units, code points and bytes of a string', () => {
  it('names a character outside the basic plane by one code point and two UTF-16 units', () => {
    expect(codePointsOf('𠮟')).toEqual(['U+20B9F']);
    expect(unitsOf('𠮟')).toEqual(['D842', 'DF9F']);
    expect(bytesOf('𠮟')).toEqual(['F0', 'A0', 'AE', '9F']);
  });

  it('encodes a hiragana letter as one unit and three UTF-8 bytes', () => {
    expect(unitsOf('あ')).toEqual(['3042']);
    expect(bytesOf('あ')).toEqual(['E3', '81', '82']);
  });

  it('counts units, code points, graphemes and bytes separately', () => {
    expect(textCounts('が𠮟')).toEqual({
      units: 4,
      codePoints: 3,
      graphemes: 2,
      bytes: 10,
    });
  });

  it('keeps a base kana and its combining voiced mark in one grapheme', () => {
    expect(graphemesOf('がき')).toEqual(['が', 'き']);
  });
});

describe('the normalization of each grapheme', () => {
  it('reports which forms change a half-width katakana with a voiced mark', () => {
    const [row] = graphemeRows('ｶﾞ');

    expect(row?.grapheme).toBe('ｶﾞ');
    expect(row?.forms.map((form) => [form.form, form.text, form.changed])).toEqual([
      ['NFC', 'ｶﾞ', false],
      ['NFD', 'ｶﾞ', false],
      ['NFKC', 'ガ', true],
      ['NFKD', 'ガ', true],
    ]);
  });

  it('decomposes a precomposed kana under NFD and leaves it under NFC', () => {
    const forms = wholeForms('が');

    expect(forms.map((form) => form.codePoints)).toEqual([
      ['U+304C'],
      ['U+304B', 'U+3099'],
      ['U+304C'],
      ['U+304B', 'U+3099'],
    ]);
  });
});

describe('the comparisons of two strings', () => {
  it('reports a decomposed kana equal only after normalization', () => {
    expect(plainComparisons('が', 'が').map((one) => one.equal)).toEqual([false, true, true]);
  });

  it('reports full-width letters equal only under NFKC', () => {
    expect(plainComparisons('ＡＢＣ', 'ABC').map((one) => one.equal)).toEqual([false, false, true]);
  });

  it('reports case equal at base strength and unequal at case strength', () => {
    const results = collatorComparisons('a', 'A', 'en');

    expect(results.map((one) => one.equal)).toEqual([true, true, false, false]);
    expect(results[0]?.label).toBe("Intl.Collator('en', { sensitivity: 'base' })");
  });
});

describe('the segments of a Japanese sentence', () => {
  it('finds words where the text has no spaces', () => {
    const words = segmentedText('吾輩は猫である。', 'word');

    expect(words.map((one) => one.segment).join('')).toBe('吾輩は猫である。');
    expect(words.length).toBeGreaterThan(3);
    expect(words.at(-1)).toEqual({ segment: '。', index: 7, wordLike: false });
  });

  it('returns the whole sentence as one part when split on spaces', () => {
    expect(spaceSplit('吾輩は猫である。')).toEqual(['吾輩は猫である。']);
  });
});
