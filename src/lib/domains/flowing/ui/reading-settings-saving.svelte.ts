import type { QueryClient } from '@tanstack/svelte-query';
import type { Container } from '$lib/container';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { ReadingSettings } from '../domain/reading-settings';
import { flowingKeys } from '../queries/flowing-keys';
import { saveReadingSettingsMutation } from '../queries/flowing-queries';
import type { SaveReadingSettingsResult } from '../use-cases/save-reading-settings';

const SETTINGS_FAILED = 'Could not save the text settings';

const SETTINGS_UNKEPT = 'This browser blocks local storage, so these settings cannot be kept.';

class ReadingSettingsSaving {
  #notify: Notify;
  #saving: WriteQuery<SaveReadingSettingsResult, ReadingSettings>;

  constructor(container: Container, notify: Notify, client: QueryClient) {
    this.#notify = notify;
    this.#saving = writeQuery(() => ({
      ...saveReadingSettingsMutation(container.flowing),
      onMutate: async (settings) => {
        await client.cancelQueries({ queryKey: flowingKeys.settings() });
        client.setQueryData(flowingKeys.settings(), settings);
      },
      onSuccess: (saved) => {
        if (saved.kind === 'storage-unavailable') this.#fail(SETTINGS_UNKEPT);
      },
      onError: (cause) => this.#fail(failureMessage(cause)),
    }));
  }

  save(settings: ReadingSettings): void {
    this.#saving.submit(settings);
  }

  #fail(message: string): void {
    this.#notify({ tone: 'danger', title: SETTINGS_FAILED, message });
  }
}

export { ReadingSettingsSaving, SETTINGS_FAILED };
