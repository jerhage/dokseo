import { describe, expect, it } from 'vitest';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { DEFAULT_READING_SETTINGS, ONE_READER } from '../domain/reading-settings';
import type {
  ReadingSettings,
  ReadingSettingsStore,
  StoredReadingSettings,
  StoredSettingsRead,
} from '../domain/reading-settings';
import { readReadingSettings } from './read-reading-settings';

function storeAnswering(read: StoredSettingsRead): ReadingSettingsStore {
  return {
    read: () => Promise.resolve(read),
    write: () => Promise.resolve({ kind: 'success' }),
  };
}

function storeHolding(record: StoredReadingSettings | null): ReadingSettingsStore {
  return storeAnswering({ kind: 'success', stored: record });
}

async function settingsRead(store: ReadingSettingsStore): Promise<ReadingSettings> {
  const read = await readReadingSettings({ settings: store });
  return read.settings;
}

describe('readReadingSettings', () => {
  it('returns every choice the reader stored', async () => {
    const settings = await settingsRead(
      storeHolding({
        reader: ONE_READER,
        textSize: 'large',
        lineSpacing: 'loose',
        showPhoneticReadings: false,
      }),
    );

    expect(settings).toEqual({
      textSize: 'large',
      lineSpacing: 'loose',
      showPhoneticReadings: false,
    });
  });

  it('returns the defaults when the browser blocks storage', async () => {
    const settings = await settingsRead(storeAnswering(STORAGE_UNAVAILABLE));

    expect(settings).toEqual(DEFAULT_READING_SETTINGS);
  });
});
