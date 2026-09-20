import { describe, expect, it } from 'vitest';
import { japaneseOcrText } from './japanese-ocr-text';

describe('japaneseOcrText', () => {
  it('strips every space the decoder put between characters', () => {
    expect(japaneseOcrText('お は よ う')).toBe('おはよう');
    expect(japaneseOcrText('こん\nに\tちは ')).toBe('こんにちは');
  });

  it('spells an ellipsis out as three dots', () => {
    expect(japaneseOcrText('そんな…')).toBe('そんな．．．');
  });

  it('turns a run of dots or katakana middle dots into that many dots', () => {
    expect(japaneseOcrText('あ・・・い')).toBe('あ．．．い');
    expect(japaneseOcrText('あ・.・い')).toBe('あ．．．い');
  });

  it('leaves a single middle dot alone', () => {
    expect(japaneseOcrText('ドラゴン・ボール')).toBe('ドラゴン・ボール');
  });

  it('widens ascii punctuation to the full-width block', () => {
    expect(japaneseOcrText('なに?')).toBe('なに？');
    expect(japaneseOcrText('やめろ!')).toBe('やめろ！');
    expect(japaneseOcrText('(a~z)')).toBe('（ａ～ｚ）');
  });

  it('widens digits with the rest of the ascii range', () => {
    expect(japaneseOcrText('第3話')).toBe('第３話');
    expect(japaneseOcrText('0123456789')).toBe('０１２３４５６７８９');
  });

  it('collapses the whitespace before the dot run is measured', () => {
    expect(japaneseOcrText('あ. .い')).toBe('あ．．い');
  });

  it('widens after the dot run is measured, never before', () => {
    expect(japaneseOcrText('・.')).toBe('．．');
  });

  it('spells the ellipsis before the dot run is measured', () => {
    expect(japaneseOcrText('あ…・')).toBe('あ．．．．');
  });

  it('applies every transform to one line', () => {
    expect(japaneseOcrText('ちょっと 待て…! 第2話?')).toBe('ちょっと待て．．．！第２話？');
  });

  it('leaves text the reference would not touch unchanged', () => {
    expect(japaneseOcrText('')).toBe('');
    expect(japaneseOcrText('これは本です')).toBe('これは本です');
  });
});
