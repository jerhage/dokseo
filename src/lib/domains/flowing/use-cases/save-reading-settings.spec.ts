import { describe, expect, it } from 'vitest';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type {
  ReadingSettings,
  ReadingSettingsStore,
  SettingsWrite,
} from '../domain/reading-settings';
import { saveReadingSettings } from './save-reading-settings';

const CHOSEN: ReadingSettings = {
  textSize: 'large',
  lineSpacing: 'relaxed',
  showPhoneticReadings: false,
};

function recordingStore(answer: SettingsWrite = { kind: 'success' }): {
  readonly store: ReadingSettingsStore;
  readonly written: ReadingSettings[];
} {
  const written: ReadingSettings[] = [];

  return {
    written,
    store: {
      read: () => Promise.resolve({ kind: 'success', stored: null }),
      write: (settings: ReadingSettings) => {
        written.push(settings);
        return Promise.resolve(answer);
      },
    },
  };
}

describe('saveReadingSettings', () => {
  it('writes the chosen settings once, for the reader rather than for a book', async () => {
    const recording = recordingStore();

    const saved = await saveReadingSettings({ settings: recording.store }, CHOSEN);

    expect(saved).toEqual({ kind: 'success' });
    expect(recording.written).toEqual([CHOSEN]);
  });

  it('reports a browser that blocks storage', async () => {
    const recording = recordingStore(STORAGE_UNAVAILABLE);

    const saved = await saveReadingSettings({ settings: recording.store }, CHOSEN);

    expect(saved).toEqual(STORAGE_UNAVAILABLE);
  });
});
