import { match } from 'ts-pattern';

type Language = 'ja' | 'ko' | 'en';

const LANGUAGES: readonly Language[] = ['ja', 'ko', 'en'];

const LANGUAGE_LEGEND = 'Language';

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

function languageName(language: Language): string {
  return match(language)
    .with('ja', () => 'Japanese')
    .with('ko', () => 'Korean')
    .with('en', () => 'English')
    .exhaustive();
}

export { LANGUAGES, LANGUAGE_LEGEND, isLanguage, languageName };
export type { Language };
