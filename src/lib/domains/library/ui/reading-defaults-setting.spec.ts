import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import { INITIAL_READING_DEFAULTS } from '../domain/book/reading-defaults';
import type { ReadingDefaults } from '../domain/book/reading-defaults';
import {
  READING_DEFAULTS_KEY,
  readReadingDefaults,
  saveReadingDefaults,
} from './reading-defaults-setting';

class FakeStore implements StringStore {
  readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }
}

const CHOSEN: ReadingDefaults = {
  language: 'en',
  languages: {
    ja: { direction: 'rtl', layoutKind: 'paged', pagePairing: 'auto' },
    ko: { direction: 'ltr', layoutKind: 'continuous', pagePairing: 'single' },
    en: { direction: 'ltr', layoutKind: 'paged', pagePairing: 'double-after-cover' },
  },
};

const STORED_KEYS = ['language', 'languages'];

const STORED_LANGUAGE_KEYS = ['direction', 'layoutKind', 'pagePairing'];

describe('readReadingDefaults and saveReadingDefaults', () => {
  it('reads back saved defaults under the reading defaults key', () => {
    const store = new FakeStore();
    saveReadingDefaults(CHOSEN, () => store);

    expect(READING_DEFAULTS_KEY).toBe('reader.library.reading-defaults');
    expect(readReadingDefaults(() => store)).toEqual(CHOSEN);
  });

  it('writes exactly the default language and the three fields of every language', () => {
    const store = new FakeStore();
    saveReadingDefaults(CHOSEN, () => store);
    const written = JSON.parse(store.entries.get(READING_DEFAULTS_KEY) ?? 'null') as {
      readonly languages: Record<string, object>;
    };

    expect(written).toEqual(CHOSEN);
    expect(Object.keys(written).toSorted()).toEqual(STORED_KEYS);
    expect(Object.keys(written.languages).toSorted()).toEqual(['en', 'ja', 'ko']);
    for (const entry of Object.values(written.languages)) {
      expect(Object.keys(entry).toSorted()).toEqual(STORED_LANGUAGE_KEYS);
    }
  });

  it('reads nothing stored as the initial defaults', () => {
    expect(readReadingDefaults(() => new FakeStore())).toEqual(INITIAL_READING_DEFAULTS);
  });

  it('reads a value that is not JSON as the initial defaults', () => {
    const store = new FakeStore();
    store.setItem(READING_DEFAULTS_KEY, '{ language: en');

    expect(readReadingDefaults(() => store)).toEqual(INITIAL_READING_DEFAULTS);
  });

  it('reads the initial defaults when no store can be reached', () => {
    expect(readReadingDefaults(() => null)).toEqual(INITIAL_READING_DEFAULTS);
  });
});
