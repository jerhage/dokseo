import { createReadingSettingsStore } from '../domains/flowing/adapters/indexeddb-reading-settings';
import type { ReadingSettings } from '../domains/flowing/domain/reading-settings';
import { readReadingSettings } from '../domains/flowing/use-cases/read-reading-settings';
import type { ReadReadingSettingsResult } from '../domains/flowing/use-cases/read-reading-settings';
import { saveReadingSettings } from '../domains/flowing/use-cases/save-reading-settings';
import type { SaveReadingSettingsResult } from '../domains/flowing/use-cases/save-reading-settings';

type FlowingUseCases = {
  readonly readReadingSettings: () => Promise<ReadReadingSettingsResult>;
  readonly saveReadingSettings: (settings: ReadingSettings) => Promise<SaveReadingSettingsResult>;
};

function buildFlowing(): FlowingUseCases {
  const settings = createReadingSettingsStore();

  return {
    readReadingSettings: () => readReadingSettings({ settings }),
    saveReadingSettings: (chosen: ReadingSettings) => saveReadingSettings({ settings }, chosen),
  };
}

export { buildFlowing };
export type { FlowingUseCases };
