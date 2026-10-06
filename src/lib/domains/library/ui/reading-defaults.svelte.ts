import type { Language } from '$lib/shared/language';
import type { ImageLayoutKind, PagePairingChoice, ReadingDirection } from '$lib/shared/layout-kind';
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

function chooseDefaultDirection(language: Language, direction: ReadingDirection): void {
  chooseLanguageDefaults(language, { ...chosen.value.languages[language], direction });
}

function chooseDefaultLayout(language: Language, layoutKind: ImageLayoutKind): void {
  chooseLanguageDefaults(language, { ...chosen.value.languages[language], layoutKind });
}

function chooseDefaultPairing(language: Language, pagePairing: PagePairingChoice): void {
  chooseLanguageDefaults(language, { ...chosen.value.languages[language], pagePairing });
}

export {
  chooseDefaultDirection,
  chooseDefaultLanguage,
  chooseDefaultLayout,
  chooseDefaultPairing,
  chooseLanguageDefaults,
  readingDefaultsChosen,
};
