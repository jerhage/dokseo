import { describe, expect, it } from 'vitest';
import { japaneseOcrText } from './japanese-ocr-text';

describe('japaneseOcrText', () => {
  it('strips every space the decoder put between characters', () => {
    expect(japaneseOcrText('お は よ う')).toBe('おはよう');
    expect(japaneseOcrText('こん\nに\tちは ')).toBe('こんにちは');
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
    expect(japaneseOcrText(text)).toBe(text);
  });
});
