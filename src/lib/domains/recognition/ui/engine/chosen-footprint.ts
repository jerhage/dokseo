import { match } from 'ts-pattern';
import type { Language } from '$lib/shared/language';
import { readReady } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import { chosenModel } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import type { LanguageSetupRead } from '../../queries/engine-queries';

function chosenFootprint(
  language: Language,
  state: ReadState<LanguageSetupRead>,
): ReadState<ModelFootprint | null> {
  return match(state)
    .with(
      { kind: 'loading' },
      { kind: 'failed' },
      (unread): ReadState<ModelFootprint | null> => unread,
    )
    .with({ kind: 'ready', value: { kind: 'success' } }, ({ value }) =>
      readReady(value.setup.selected === null ? null : chosenModel(language, value.setup.selected)),
    )
    .with({ kind: 'ready', value: { kind: 'storage-unavailable' } }, () =>
      readReady(chosenModel(language, null)),
    )
    .exhaustive();
}

export { chosenFootprint };
