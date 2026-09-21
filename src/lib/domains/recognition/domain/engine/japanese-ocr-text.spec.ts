import { describe, expect, it } from 'vitest';
import { japaneseOcrText } from './japanese-ocr-text';

describe('japaneseOcrText', () => {
  it('strips every space the decoder put between characters', () => {
    expect(japaneseOcrText('お は よ う')).toBe('おはよう');
    expect(japaneseOcrText('こん\nに\tちは ')).toBe('こんにちは');
  });

  it('leaves an ellipsis as the model wrote it', () => {
    expect(japaneseOcrText('そんな…')).toBe('そんな…');
  });

  it('leaves a run of middle dots as the model wrote it', () => {
    expect(japaneseOcrText('あ・・・い')).toBe('あ・・・い');
  });

  it('leaves half-width punctuation as the model wrote it', () => {
    expect(japaneseOcrText('なに?')).toBe('なに?');
    expect(japaneseOcrText('やめろ!')).toBe('やめろ!');
  });

  it('leaves digits as the model wrote them', () => {
    expect(japaneseOcrText('第3話')).toBe('第3話');
  });

  it('leaves ordinary japanese untouched', () => {
    expect(japaneseOcrText('')).toBe('');
    expect(japaneseOcrText('これは本です')).toBe('これは本です');
    expect(japaneseOcrText('ドラゴン・ボール')).toBe('ドラゴン・ボール');
  });
});
