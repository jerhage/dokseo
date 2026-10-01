import { match } from 'ts-pattern';
import type { ReadState } from '$lib/shared/read-state';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import type { ReadingSettings } from '../domain/reading-settings';

type OpeningSettings =
  | { readonly kind: 'reading' }
  | { readonly kind: 'read'; readonly settings: ReadingSettings };

const STILL_READING: OpeningSettings = { kind: 'reading' };

function openingSettings(state: ReadState<ReadingSettings>): OpeningSettings {
  return match(state)
    .returnType<OpeningSettings>()
    .with({ kind: 'loading' }, () => STILL_READING)
    .with({ kind: 'failed' }, () => ({ kind: 'read', settings: DEFAULT_READING_SETTINGS }))
    .with({ kind: 'ready' }, ({ value }) => ({ kind: 'read', settings: value }))
    .exhaustive();
}

export { openingSettings };
export type { OpeningSettings };
