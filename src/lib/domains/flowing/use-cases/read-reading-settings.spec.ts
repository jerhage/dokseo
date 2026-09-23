import { describe, expect, it } from 'vitest';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { DEFAULT_READING_SETTINGS, ONE_READER } from '../domain/reading-settings';
import type {
  ReadingSettingsError,
  ReadingSettingsStore,
  StoredReadingSettings,
} from '../domain/reading-settings';
import { readReadingSettings } from './read-reading-settings';

function storeHolding(
  record: StoredReadingSettings | null,
  failure: ReadingSettingsError | null = null,
): ReadingSettingsStore {
  return {
    read: (): Promise<Result<StoredReadingSettings | null, ReadingSettingsError>> =>
      Promise.resolve(failure === null ? ok(record) : err(failure)),
    write: () => Promise.resolve(ok(undefined)),
  };
}

describe('readReadingSettings', () => {
  it('returns every choice the reader stored', async () => {
    const settings = await readReadingSettings({
      settings: storeHolding({
        reader: ONE_READER,
        textSize: 'large',
        lineSpacing: 'loose',
        showPhoneticReadings: false,
      }),
    });

    expect(settings).toEqual({
      textSize: 'large',
      lineSpacing: 'loose',
      showPhoneticReadings: false,
    });
  });

  it('returns the readings shown for a record written before the choice existed', async () => {
    const settings = await readReadingSettings({
      settings: storeHolding({ reader: ONE_READER, textSize: 'large', lineSpacing: 'loose' }),
    });

    expect(settings).toEqual({
      textSize: 'large',
      lineSpacing: 'loose',
      showPhoneticReadings: true,
    });
  });

  it('returns the defaults for a reader who has never chosen', async () => {
    const settings = await readReadingSettings({ settings: storeHolding(null) });

    expect(settings).toEqual(DEFAULT_READING_SETTINGS);
  });

  it('returns the defaults when storage will not answer', async () => {
    const settings = await readReadingSettings({
      settings: storeHolding(null, { kind: 'storage-unavailable' }),
    });

    expect(settings).toEqual(DEFAULT_READING_SETTINGS);
  });
});
