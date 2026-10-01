import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import type { ReadingSettings } from '../domain/reading-settings';
import { flowingKeys } from './flowing-keys';
import {
  readingSettingsQuery,
  saveReadingPlaceMutation,
  saveReadingSettingsMutation,
} from './flowing-queries';

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

describe('saveReadingPlaceMutation', () => {
  const book = bookId('one');
  const place = textPlace('epubcfi(/6/14!/4/2/14/1:0)', 0.4);

  it('passes the book and the place, and resolves a refused save as an answer', async () => {
    const asked: [BookId, ReadingPlace][] = [];
    const placing = new MutationObserver(
      createTestQueryClient(),
      saveReadingPlaceMutation({
        saveReadingPlace: (id, at) => {
          asked.push([id, at]);
          return Promise.resolve(STORAGE_UNAVAILABLE);
        },
      }),
    );

    expect(await placing.mutate({ id: book, place })).toEqual(STORAGE_UNAVAILABLE);
    expect(asked).toEqual([[book, place]]);
  });

  it('rejects with the error a failed save throws', async () => {
    const broken = new Error('broken');
    const placing = new MutationObserver(
      createTestQueryClient(),
      saveReadingPlaceMutation({ saveReadingPlace: () => Promise.reject(broken) }),
    );

    await expect(placing.mutate({ id: book, place })).rejects.toBe(broken);
  });
});
