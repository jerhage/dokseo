import { describe, expect, it } from 'vitest';
import type { TextRecognizer } from '../domain/text-recognizer';
import { pauseModelLoad } from './pause-model-load';

describe('pauseModelLoad', () => {
  it('stops the worker and touches nothing that was written to this device', () => {
    let cancelled = 0;

    const recognizer: TextRecognizer = {
      id: 'manga-ocr',
      prepare: () => Promise.reject(new Error('not used')),
      cancel: () => {
        cancelled += 1;
      },
      recognize: () => Promise.reject(new Error('not used')),
    };

    pauseModelLoad({ recognizer });
    expect(cancelled).toBe(1);
  });
});
