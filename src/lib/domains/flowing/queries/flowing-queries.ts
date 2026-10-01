import { mutationOptions, queryOptions } from '@tanstack/svelte-query';
import type { ReadingSettings } from '../domain/reading-settings';
import type { ReadReadingSettingsResult } from '../use-cases/read-reading-settings';
import type { SaveReadingSettingsResult } from '../use-cases/save-reading-settings';
import { flowingKeys } from './flowing-keys';

type FlowingReads = {
  readonly readReadingSettings: () => Promise<ReadReadingSettingsResult>;
};

type FlowingWrites = {
  readonly saveReadingSettings: (settings: ReadingSettings) => Promise<SaveReadingSettingsResult>;
};

function readingSettingsQuery(flowing: FlowingReads) {
  return queryOptions({
    queryKey: flowingKeys.settings(),
    queryFn: async () => {
      const read = await flowing.readReadingSettings();
      return read.settings;
    },
    staleTime: 0,
  });
}

function saveReadingSettingsMutation(flowing: FlowingWrites) {
  return mutationOptions({
    mutationFn: (settings: ReadingSettings) => flowing.saveReadingSettings(settings),
  });
}

export { readingSettingsQuery, saveReadingSettingsMutation };
export type { FlowingReads, FlowingWrites };
