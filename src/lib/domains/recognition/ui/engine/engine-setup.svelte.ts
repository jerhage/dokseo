import { LANGUAGES } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import type { GpuDetection } from '../../domain/engine/compute-choice';
import { modelsFor } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import type { LanguageSetup } from '../../queries/engine-queries';

type EngineChoice = LanguageSetup & { readonly detection: GpuDetection };

function engineLanguages(): readonly Language[] {
  return LANGUAGES.filter((language) => modelsFor(language).length > 0);
}

function shownModel(choice: Pick<LanguageSetup, 'models' | 'selected'>): ModelFootprint {
  return choice.models.find((known) => known.modelId === choice.selected) ?? choice.models[0];
}

function engineChoiceOf(setup: LanguageSetup, detection: GpuDetection): EngineChoice {
  return { ...setup, detection };
}

export { engineChoiceOf, engineLanguages, shownModel };
export type { EngineChoice };
