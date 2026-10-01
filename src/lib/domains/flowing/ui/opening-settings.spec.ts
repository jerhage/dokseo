import { describe, expect, it } from 'vitest';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import type { ReadingSettings } from '../domain/reading-settings';
import { openingSettings } from './opening-settings';

const STORED: ReadingSettings = {
  textSize: 'largest',
  lineSpacing: 'loose',
  showPhoneticReadings: false,
};

describe('openingSettings', () => {
  it('holds the open back while the settings are read', () => {
    expect(openingSettings(LOADING)).toEqual({ kind: 'reading' });
  });

  it('opens at the settings the reader stored', () => {
    expect(openingSettings(readReady(STORED))).toEqual({ kind: 'read', settings: STORED });
  });

  it('opens at the defaults when the settings read fails', () => {
    expect(openingSettings(readFailed('Something went wrong: the disk went away'))).toEqual({
      kind: 'read',
      settings: DEFAULT_READING_SETTINGS,
    });
  });
});
