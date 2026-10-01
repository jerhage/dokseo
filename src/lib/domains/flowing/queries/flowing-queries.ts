import { mutationOptions, queryOptions } from '@tanstack/svelte-query';
import type { BookId } from '$lib/shared/ids';
import type { ReadingPlace } from '$lib/shared/reading-place';
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

type PlaceSaving<R> = {
  readonly saveReadingPlace: (id: BookId, place: ReadingPlace) => Promise<R>;
};

type PlaceRequest = { readonly id: BookId; readonly place: ReadingPlace };

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

function saveReadingPlaceMutation<R>(library: PlaceSaving<R>) {
  return mutationOptions({
    mutationFn: ({ id, place }: PlaceRequest) => library.saveReadingPlace(id, place),
  });
}

export { readingSettingsQuery, saveReadingPlaceMutation, saveReadingSettingsMutation };
export type { FlowingReads, FlowingWrites, PlaceRequest, PlaceSaving };
