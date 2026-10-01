import { mutationOptions, queryOptions } from '@tanstack/svelte-query';
import type { Result } from '$lib/shared/result';
import type { ReadingSettings, ReadingSettingsError } from '../domain/reading-settings';
import { flowingKeys } from './flowing-keys';

type FlowingReads = {
  readonly readReadingSettings: () => Promise<ReadingSettings>;
};

type FlowingWrites = {
  readonly saveReadingSettings: (
    settings: ReadingSettings,
  ) => Promise<Result<void, ReadingSettingsError>>;
};

function readingSettingsQuery(flowing: FlowingReads) {
  return queryOptions({
    queryKey: flowingKeys.settings(),
    queryFn: () => flowing.readReadingSettings(),
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
