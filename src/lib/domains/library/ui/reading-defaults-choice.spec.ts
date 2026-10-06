import { describe, expect, it } from 'vitest';
import { INITIAL_READING_DEFAULTS } from '../domain/book/reading-defaults';
import { readReadingDefaults } from './reading-defaults-setting';
import {
  chooseDefaultLanguage,
  chooseLanguageDefaults,
  readingDefaultsChosen,
} from './reading-defaults.svelte';

describe('the chosen reading defaults', () => {
  it('starts from the initial defaults and saves each choice as it is made', () => {
    expect(readingDefaultsChosen()).toEqual(INITIAL_READING_DEFAULTS);

    chooseDefaultLanguage('ko');
    const korean = { direction: 'ltr', layoutKind: 'continuous', pagePairing: 'single' } as const;
    chooseLanguageDefaults('ko', korean);

    const expected = {
      language: 'ko',
      languages: { ...INITIAL_READING_DEFAULTS.languages, ko: korean },
    };
    expect(readingDefaultsChosen()).toEqual(expected);
    expect(readReadingDefaults()).toEqual(expected);
  });
});
