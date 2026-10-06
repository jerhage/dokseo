import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '$lib/shared/language';
import {
  INITIAL_READING_DEFAULTS,
  initialLanguageDefaults,
  newBookReading,
  readingDefaultsFromStored,
  withDefaultLanguage,
  withLanguageDefaults,
} from './reading-defaults';
import type { DeclaredReading, ReadingDefaults } from './reading-defaults';

const RIGHT_TO_LEFT = { direction: 'rtl', layoutKind: 'paged', pagePairing: 'auto' } as const;

const LEFT_TO_RIGHT = { direction: 'ltr', layoutKind: 'paged', pagePairing: 'auto' } as const;

const INITIAL_LANGUAGES = { ja: RIGHT_TO_LEFT, ko: LEFT_TO_RIGHT, en: LEFT_TO_RIGHT } as const;

const CHOSEN: ReadingDefaults = {
  language: 'ko',
  languages: {
    ja: { direction: 'rtl', layoutKind: 'paged', pagePairing: 'double-after-cover' },
    ko: { direction: 'ltr', layoutKind: 'continuous', pagePairing: 'single' },
    en: { direction: 'ltr', layoutKind: 'paged', pagePairing: 'double' },
  },
};

const NOTHING_DECLARED: DeclaredReading = { language: null, direction: null, layoutKind: null };

describe('initialLanguageDefaults', () => {
  it('gives Japanese right to left, pages and automatic pairing', () => {
    expect(initialLanguageDefaults('ja')).toEqual(RIGHT_TO_LEFT);
  });

  it.each(LANGUAGES.filter((language) => language !== 'ja'))(
    'gives %s left to right, pages and automatic pairing',
    (language) => {
      expect(initialLanguageDefaults(language)).toEqual(LEFT_TO_RIGHT);
    },
  );
});

describe('INITIAL_READING_DEFAULTS', () => {
  it('falls back to Japanese and gives every language its initial defaults', () => {
    expect(INITIAL_READING_DEFAULTS).toEqual({
      language: 'ja',
      languages: INITIAL_LANGUAGES,
    });
  });
});

describe('readingDefaultsFromStored', () => {
  it('reads back every field of a stored record', () => {
    expect(readingDefaultsFromStored(JSON.parse(JSON.stringify(CHOSEN)))).toEqual(CHOSEN);
  });

  it.each([null, undefined, 'ja', 7, []])('reads %s as the initial defaults', (stored) => {
    expect(readingDefaultsFromStored(stored)).toEqual(INITIAL_READING_DEFAULTS);
  });

  it('reads a missing language entry as that language’s initial defaults', () => {
    const stored = { language: 'en', languages: { ko: CHOSEN.languages.ko } };

    expect(readingDefaultsFromStored(stored)).toEqual({
      language: 'en',
      languages: { ja: RIGHT_TO_LEFT, ko: CHOSEN.languages.ko, en: LEFT_TO_RIGHT },
    });
  });

  it('replaces each unknown or missing field with its initial value and keeps the rest', () => {
    const stored = {
      language: 'zh',
      languages: {
        ja: { direction: 'up', layoutKind: 'continuous', pagePairing: 'single' },
        ko: { direction: 'rtl', layoutKind: 'flow' },
        en: { layoutKind: 'paged', pagePairing: 'triple' },
      },
    };

    expect(readingDefaultsFromStored(stored)).toEqual({
      language: 'ja',
      languages: {
        ja: { direction: 'rtl', layoutKind: 'continuous', pagePairing: 'single' },
        ko: { direction: 'rtl', layoutKind: 'paged', pagePairing: 'auto' },
        en: { direction: 'ltr', layoutKind: 'paged', pagePairing: 'auto' },
      },
    });
  });

  it('drops a field it does not know', () => {
    const stored = {
      ...CHOSEN,
      theme: 'paper',
      languages: { ...CHOSEN.languages, zh: RIGHT_TO_LEFT },
    };

    expect(readingDefaultsFromStored(stored)).toEqual(CHOSEN);
  });
});

describe('withDefaultLanguage', () => {
  it('changes the default language and keeps every language’s defaults', () => {
    expect(withDefaultLanguage(CHOSEN, 'en')).toEqual({ ...CHOSEN, language: 'en' });
  });
});

describe('withLanguageDefaults', () => {
  it('changes one language’s defaults and leaves the others', () => {
    const next = { direction: 'rtl', layoutKind: 'paged', pagePairing: 'auto' } as const;

    expect(withLanguageDefaults(CHOSEN, 'ko', next)).toEqual({
      language: 'ko',
      languages: { ...CHOSEN.languages, ko: next },
    });
  });
});

describe('newBookReading', () => {
  it('takes the language, direction and layout the file declares, and the pairing of that language', () => {
    const declared: DeclaredReading = { language: 'en', direction: 'rtl', layoutKind: 'flow' };

    expect(newBookReading(declared, 'ja', CHOSEN)).toEqual({
      language: 'en',
      direction: 'rtl',
      layoutKind: 'flow',
      pagePairing: 'double',
    });
  });

  it('takes the language the title shows when the file declares none', () => {
    expect(newBookReading(NOTHING_DECLARED, 'ja', CHOSEN)).toEqual({
      language: 'ja',
      ...CHOSEN.languages.ja,
    });
  });

  it('falls back to the default language when neither the file nor the title shows one', () => {
    expect(newBookReading(NOTHING_DECLARED, null, CHOSEN)).toEqual({
      language: 'ko',
      ...CHOSEN.languages.ko,
    });
  });

  it('fills only the direction and layout the file leaves out', () => {
    const declared: DeclaredReading = { language: 'ko', direction: null, layoutKind: 'paged' };

    expect(newBookReading(declared, null, CHOSEN)).toEqual({
      language: 'ko',
      direction: 'ltr',
      layoutKind: 'paged',
      pagePairing: 'single',
    });
  });

  it('gives a book with nothing declared or shown what a new book got before any default was chosen', () => {
    expect(newBookReading(NOTHING_DECLARED, null, INITIAL_READING_DEFAULTS)).toEqual({
      language: 'ja',
      ...RIGHT_TO_LEFT,
    });
  });
});
