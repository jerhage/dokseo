import type { QueryClient } from '@tanstack/svelte-query';
import type { Container } from '$lib/container';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import type { ReadingSettings } from '../domain/reading-settings';
import { flowingKeys } from '../queries/flowing-keys';
import { readingSettingsQuery, saveReadingSettingsMutation } from '../queries/flowing-queries';
import type { SaveReadingSettingsResult } from '../use-cases/save-reading-settings';
import { INK_FOR_THE_DARK_PAGE, sameInk } from './flow-styles';
import type { PageInk } from './flow-styles';
import type { FlowSurface } from './flow-surface';

const SETTINGS_FAILED = 'Could not save the text settings';

const SETTINGS_UNKEPT = 'This browser blocks local storage, so these settings cannot be kept.';

class FlowAppearance {
  settings = $state.raw<ReadingSettings>(DEFAULT_READING_SETTINGS);

  #container: Container;
  #client: QueryClient;
  #notify: Notify;
  #surface: () => FlowSurface | null;
  #saving: WriteQuery<SaveReadingSettingsResult, ReadingSettings>;
  #ink: PageInk = INK_FOR_THE_DARK_PAGE;

  constructor(
    container: Container,
    notify: Notify,
    client: QueryClient,
    surface: () => FlowSurface | null,
  ) {
    this.#container = container;
    this.#client = client;
    this.#notify = notify;
    this.#surface = surface;
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

  get ink(): PageInk {
    return this.#ink;
  }

  chosen(): Promise<ReadingSettings> {
    return this.#client
      .fetchQuery(readingSettingsQuery(this.#container.flowing))
      .catch(() => DEFAULT_READING_SETTINGS);
  }

  restyle(settings: ReadingSettings): void {
    this.settings = settings;
    this.#surface()?.restyle(settings, this.#ink);
    this.#saving.submit(settings);
  }

  paint(ink: PageInk): void {
    if (sameInk(this.#ink, ink)) return;

    this.#ink = ink;
    this.#surface()?.restyle(this.settings, ink);
  }

  repaintSince(inked: PageInk, surface: FlowSurface): void {
    if (!sameInk(inked, this.#ink)) surface.restyle(this.settings, this.#ink);
  }

  #fail(message: string): void {
    this.#notify({ tone: 'danger', title: SETTINGS_FAILED, message });
  }
}

export { FlowAppearance, SETTINGS_FAILED };
