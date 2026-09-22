import type { Result } from '$lib/shared/result';
import type {
  ReadingSettings,
  ReadingSettingsError,
  ReadingSettingsStore,
} from '../domain/reading-settings';

type SaveReadingSettingsDeps = {
  readonly settings: ReadingSettingsStore;
};

function saveReadingSettings(
  deps: SaveReadingSettingsDeps,
  settings: ReadingSettings,
): Promise<Result<void, ReadingSettingsError>> {
  return deps.settings.write(settings);
}

export { saveReadingSettings };
export type { SaveReadingSettingsDeps };
