import { readingSettingsOf } from '../domain/reading-settings';
import type { ReadingSettings, ReadingSettingsStore } from '../domain/reading-settings';

type ReadReadingSettingsDeps = {
  readonly settings: ReadingSettingsStore;
};

async function readReadingSettings(deps: ReadReadingSettingsDeps): Promise<ReadingSettings> {
  const record = await deps.settings.read();

  return readingSettingsOf(record.ok ? record.value : null);
}

export { readReadingSettings };
export type { ReadReadingSettingsDeps };
