import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import type { ReadingSettings } from '../domain/reading-settings';
import { flowingKeys } from './flowing-keys';
import { readingSettingsQuery, saveReadingSettingsMutation } from './flowing-queries';

const LARGE: ReadingSettings = { ...DEFAULT_READING_SETTINGS, textSize: 'large' };

describe('readingSettingsQuery', () => {
  it('resolves the stored settings under the flowing settings key', async () => {
    const client = createTestQueryClient();
    const options = readingSettingsQuery({
      readReadingSettings: () => Promise.resolve({ kind: 'success', settings: LARGE }),
    });

    const read = await client.fetchQuery(options);

    expect(read).toEqual(LARGE);
    expect(options.queryKey).toEqual(flowingKeys.settings());
    expect(options.queryKey.slice(0, 1)).toEqual(flowingKeys.all());
  });
});

describe('saveReadingSettingsMutation', () => {
  it('resolves a refused save as an answer, not a rejection', async () => {
    const saved: ReadingSettings[] = [];
    const observer = new MutationObserver(
      createTestQueryClient(),
      saveReadingSettingsMutation({
        saveReadingSettings: (settings) => {
          saved.push(settings);
          return Promise.resolve(STORAGE_UNAVAILABLE);
        },
      }),
    );

    expect(await observer.mutate(LARGE)).toEqual(STORAGE_UNAVAILABLE);
    expect(saved).toEqual([LARGE]);
  });

  it('resolves a kept save', async () => {
    const observer = new MutationObserver(
      createTestQueryClient(),
      saveReadingSettingsMutation({
        saveReadingSettings: () => Promise.resolve({ kind: 'success' }),
      }),
    );

    expect(await observer.mutate(LARGE)).toEqual({ kind: 'success' });
  });
});
