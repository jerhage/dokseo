import { describe, expect, it } from 'vitest';
import { hasNoText, recognizedText } from './recognized-text';

describe('recognizedText', () => {
  it('trims the ends of the recognized string', () => {
    expect(recognizedText('  もう時間がないよ\n').text).toBe('もう時間がないよ');
  });

  it('keeps interior whitespace', () => {
    expect(recognizedText(' 어서 오세요 ').text).toBe('어서 오세요');
  });

  it('defaults the confidence to null', () => {
    expect(recognizedText('こっちに来て').confidence).toBeNull();
  });

  it('keeps a confidence it was given', () => {
    expect(recognizedText('こっちに来て', 0.42).confidence).toBe(0.42);
  });
});

describe('hasNoText', () => {
  it('reports an empty string as having no text', () => {
    expect(hasNoText(recognizedText(''))).toBe(true);
  });

  it('reports a string of only whitespace as having no text', () => {
    expect(hasNoText(recognizedText('   \n\t'))).toBe(true);
  });

  it('reports a recognized line as having text', () => {
    expect(hasNoText(recognizedText('早く逃げろ'))).toBe(false);
  });
});
