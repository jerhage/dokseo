import { describe, expect, it } from 'vitest';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { JAPANESE_OCR_MODEL } from '../model/model-footprint';
import { setupChoice, storedChoice } from './recognizer-setup';

describe('storedChoice', () => {
  it('chooses what the stored setup names', () => {
    const stored = { language: 'ja' as const, modelId: JAPANESE_OCR_MODEL.modelId, compute: 'gpu' };

    expect(storedChoice('ja', { kind: 'success', stored })).toEqual(setupChoice('ja', stored));
  });

  it('chooses the language default when the browser blocks the store', () => {
    expect(storedChoice('ja', STORAGE_UNAVAILABLE)).toEqual(setupChoice('ja', null));
    expect(storedChoice('ja', STORAGE_UNAVAILABLE).model).toEqual(JAPANESE_OCR_MODEL);
  });
});
