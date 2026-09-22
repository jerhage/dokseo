import { describe, expect, it } from 'vitest';
import { err, ok } from '$lib/shared/result';
import type {
  ReadingSettings,
  ReadingSettingsError,
  ReadingSettingsStore,
} from '../domain/reading-settings';
import { saveReadingSettings } from './save-reading-settings';

const CHOSEN: ReadingSettings = { textSize: 'large', lineSpacing: 'relaxed' };

function recordingStore(failure: ReadingSettingsError | null = null): {
  readonly store: ReadingSettingsStore;
  readonly written: ReadingSettings[];
} {
  const written: ReadingSettings[] = [];

  return {
    written,
    store: {
      read: () => Promise.resolve(ok(null)),
      write: (settings: ReadingSettings) => {
        written.push(settings);
        return Promise.resolve(failure === null ? ok(undefined) : err(failure));
      },
    },
  };
}

describe('saveReadingSettings', () => {
  it('writes the chosen settings once, for the reader rather than for a book', async () => {
    const recording = recordingStore();

    const saved = await saveReadingSettings({ settings: recording.store }, CHOSEN);

    expect(saved).toEqual({ ok: true, value: undefined });
    expect(recording.written).toEqual([CHOSEN]);
  });

  it('reports storage that refused the write', async () => {
    const recording = recordingStore({ kind: 'storage-failed', cause: 'quota' });

    const saved = await saveReadingSettings({ settings: recording.store }, CHOSEN);

    expect(saved).toEqual({ ok: false, error: { kind: 'storage-failed', cause: 'quota' } });
  });
});
