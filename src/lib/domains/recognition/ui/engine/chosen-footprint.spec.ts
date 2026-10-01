import { describe, expect, it } from 'vitest';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import { JAPANESE_OCR_MODEL, modelsFor } from '../../domain/model/model-footprint';
import { offeredModels } from '../../queries/engine-queries';
import type { LanguageSetupRead } from '../../queries/engine-queries';
import { chosenFootprint } from './chosen-footprint';

const SECOND = at(modelsFor('ja'), 1);

function stored(selected: string | null): LanguageSetupRead {
  return {
    kind: 'success',
    setup: { language: 'ja', models: offeredModels('ja'), selected, compute: 'auto' },
  };
}

describe('chosenFootprint', () => {
  it('answers the model of the stored setup', () => {
    expect(chosenFootprint('ja', readReady(stored(SECOND.modelId)))).toEqual(readReady(SECOND));
  });

  it('answers the default model of the language when the browser blocks the setup read', () => {
    expect(chosenFootprint('ja', readReady(STORAGE_UNAVAILABLE))).toEqual(
      readReady(JAPANESE_OCR_MODEL),
    );
  });

  it('answers nothing when the stored setup names no model to download', () => {
    expect(chosenFootprint('ja', readReady(stored(null)))).toEqual(readReady(null));
  });

  it('passes a setup read that failed on as a failure, not a default model', () => {
    expect(chosenFootprint('ja', readFailed('The engine choice could not be read: gone'))).toEqual(
      readFailed('The engine choice could not be read: gone'),
    );
  });

  it('passes a setup still being read on as loading', () => {
    expect(chosenFootprint('ja', LOADING)).toEqual(LOADING);
  });
});
