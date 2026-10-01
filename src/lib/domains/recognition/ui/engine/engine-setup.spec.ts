import { describe, expect, it } from 'vitest';
import { at } from '$lib/shared/testing/at';
import type { GpuDetection } from '../../domain/engine/compute-choice';
import { modelsFor } from '../../domain/model/model-footprint';
import { offeredModels } from '../../queries/engine-queries';
import type { LanguageSetup, OfferedModels } from '../../queries/engine-queries';
import { engineChoiceOf, shownModel } from './engine-setup.svelte';

const DETECTED: GpuDetection = { available: true, description: 'Test GPU' };

const JAPANESE = modelsFor('ja');

const SECOND = at(JAPANESE, 1);

function setupOf(over: Partial<LanguageSetup> = {}): LanguageSetup {
  return {
    language: 'ja',
    models: offeredModels('ja') as OfferedModels,
    selected: null,
    compute: 'auto',
    ...over,
  };
}

describe('shownModel', () => {
  it('shows the selected model', () => {
    expect(shownModel(setupOf({ selected: SECOND.modelId }))).toBe(SECOND);
  });

  it('shows the first model when none or an unknown one is selected', () => {
    expect(shownModel(setupOf())).toBe(at(JAPANESE, 0));
    expect(shownModel(setupOf({ selected: 'gone' }))).toBe(at(JAPANESE, 0));
  });
});

describe('engineChoiceOf', () => {
  it('puts the GPU detection beside the setup', () => {
    const setup = setupOf({ selected: SECOND.modelId, compute: 'gpu' });

    expect(engineChoiceOf(setup, DETECTED)).toEqual({ ...setup, detection: DETECTED });
  });
});
