import type { QueryClient } from '@tanstack/svelte-query';
import type { Language } from '$lib/shared/language';
import { chosenModel } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import { recognizerSetupQuery } from '../../queries/engine-queries';
import type { EngineReads } from '../../queries/engine-queries';

async function readChosenFootprint(
  client: QueryClient,
  recognition: Pick<EngineReads, 'readRecognizerSetup'>,
  language: Language,
): Promise<ModelFootprint | null> {
  const setup = await client
    .fetchQuery(recognizerSetupQuery(recognition, language))
    .catch(() => null);

  if (setup === null || setup.kind !== 'success') return chosenModel(language, null);
  return setup.setup.selected === null ? null : chosenModel(language, setup.setup.selected);
}

export { readChosenFootprint };
