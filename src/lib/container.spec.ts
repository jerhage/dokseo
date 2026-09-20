import { describe, expect, it } from 'vitest';
import { recognizerFor } from './container';

describe('recognizerFor', () => {
  it('resolves a recognizer of its own for each language', async () => {
    expect((await recognizerFor('ja')).id).toBe('manga-ocr');
    expect((await recognizerFor('ko')).id).toBe('paddle-ocr');
  });

  it('reuses one recognizer per language', async () => {
    const [first, second] = await Promise.all([recognizerFor('ja'), recognizerFor('ja')]);
    expect(second).toBe(first);
    expect(await recognizerFor('ja')).toBe(first);
  });

  it('holds a separate recognizer for each language', async () => {
    expect(await recognizerFor('ko')).not.toBe(await recognizerFor('ja'));
  });
});
