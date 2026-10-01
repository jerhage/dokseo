import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { ReadingSettings, ReadingSettingsStore } from '../domain/reading-settings';

type SaveReadingSettingsResult = { readonly kind: 'success' } | StorageUnavailable;

type SaveReadingSettingsDeps = {
  readonly settings: ReadingSettingsStore;
};

function saveReadingSettings(
  deps: SaveReadingSettingsDeps,
  settings: ReadingSettings,
): Promise<SaveReadingSettingsResult> {
  return deps.settings.write(settings);
}

export { saveReadingSettings };
export type { SaveReadingSettingsDeps, SaveReadingSettingsResult };
