import type { Language } from '$lib/shared/language';
import { RememberedChoice } from '$lib/shared/remembered-choice.svelte';
import { withDefaultLanguage, withLanguageDefaults } from '../domain/book/reading-defaults';
import type { LanguageDefaults, ReadingDefaults } from '../domain/book/reading-defaults';
import { readReadingDefaults, saveReadingDefaults } from './reading-defaults-setting';

const chosen = new RememberedChoice<ReadingDefaults>(readReadingDefaults, saveReadingDefaults);

function readingDefaultsChosen(): ReadingDefaults {
  return chosen.value;
}

function chooseDefaultLanguage(language: Language): void {
  chosen.choose(withDefaultLanguage(chosen.value, language));
}

function chooseLanguageDefaults(language: Language, defaults: LanguageDefaults): void {
  chosen.choose(withLanguageDefaults(chosen.value, language, defaults));
}

export { chooseDefaultLanguage, chooseLanguageDefaults, readingDefaultsChosen };
