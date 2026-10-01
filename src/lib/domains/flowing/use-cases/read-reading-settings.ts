import { match } from 'ts-pattern';
import { readingSettingsOf } from '../domain/reading-settings';
import type { ReadingSettings, ReadingSettingsStore } from '../domain/reading-settings';

type ReadReadingSettingsResult = { readonly kind: 'success'; readonly settings: ReadingSettings };

type ReadReadingSettingsDeps = {
  readonly settings: ReadingSettingsStore;
};

async function readReadingSettings(
  deps: ReadReadingSettingsDeps,
): Promise<ReadReadingSettingsResult> {
  const read = await deps.settings.read();
  const stored = match(read)
    .with({ kind: 'success' }, (found) => found.stored)
    .with({ kind: 'storage-unavailable' }, () => null)
    .exhaustive();

  return { kind: 'success', settings: readingSettingsOf(stored) };
}

export { readReadingSettings };
export type { ReadReadingSettingsDeps, ReadReadingSettingsResult };
