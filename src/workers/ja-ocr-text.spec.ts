import { describe, expect, it } from 'vitest';
import { jaOcrText } from './ja-ocr-text';

describe('jaOcrText', () => {
  it('strips every space the decoder put between characters', () => {
    expect(jaOcrText('お は よ う')).toBe('おはよう');
    expect(jaOcrText('こん\nに\tちは ')).toBe('こんにちは');
  });

  it.each([
    'そんな…',
    'あ・・・い',
    'なに?',
    'やめろ!',
    '第3話',
    '',
    'これは本です',
    'ドラゴン・ボール',
  ])('leaves %j as the model wrote it', (text) => {
    expect(jaOcrText(text)).toBe(text);
  });
});
