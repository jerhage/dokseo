import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { err, ok } from '$lib/shared/result';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import type { ReadingSettings, ReadingSettingsError } from '../domain/reading-settings';
import { flowingKeys } from './flowing-keys';
import { readingSettingsQuery, saveReadingSettingsMutation } from './flowing-queries';

const LARGE: ReadingSettings = { ...DEFAULT_READING_SETTINGS, textSize: 'large' };

describe('readingSettingsQuery', () => {
  it('resolves the stored settings under the flowing settings key', async () => {
    const client = createTestQueryClient();
    const options = readingSettingsQuery({ readReadingSettings: () => Promise.resolve(LARGE) });

    const read = await client.fetchQuery(options);

    expect(read).toEqual(LARGE);
    expect(options.queryKey).toEqual(flowingKeys.settings());
    expect(options.queryKey.slice(0, 1)).toEqual(flowingKeys.all());
  });
});

describe('saveReadingSettingsMutation', () => {
  it('resolves a refused save as an answer, not a rejection', async () => {
    const refused = err<ReadingSettingsError>({ kind: 'storage-failed', cause: 'quota' });
    const saved: ReadingSettings[] = [];
    const observer = new MutationObserver(
      createTestQueryClient(),
      saveReadingSettingsMutation({
        saveReadingSettings: (settings) => {
          saved.push(settings);
          return Promise.resolve(refused);
        },
      }),
    );

    expect(await observer.mutate(LARGE)).toEqual(refused);
    expect(saved).toEqual([LARGE]);
  });

  it('resolves a kept save', async () => {
    const observer = new MutationObserver(
      createTestQueryClient(),
      saveReadingSettingsMutation({ saveReadingSettings: () => Promise.resolve(ok(undefined)) }),
    );

    expect(await observer.mutate(LARGE)).toEqual(ok(undefined));
  });
});
