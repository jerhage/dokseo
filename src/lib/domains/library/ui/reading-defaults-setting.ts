import { rememberedString } from '$lib/platform/storage/remembered-string';
import type { LocateStore } from '$lib/platform/storage/remembered-string';
import { readingDefaultsFromStored } from '../domain/book/reading-defaults';
import type { ReadingDefaults } from '../domain/book/reading-defaults';

const READING_DEFAULTS_KEY = 'reader.library.reading-defaults';

function parsedJson(text: string | null): unknown {
  if (text === null) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readReadingDefaults(locate?: LocateStore): ReadingDefaults {
  return readingDefaultsFromStored(
    parsedJson(rememberedString(READING_DEFAULTS_KEY, locate).read()),
  );
}

function saveReadingDefaults(defaults: ReadingDefaults, locate?: LocateStore): void {
  rememberedString(READING_DEFAULTS_KEY, locate).write(JSON.stringify(defaults));
}

export { READING_DEFAULTS_KEY, readReadingDefaults, saveReadingDefaults };
