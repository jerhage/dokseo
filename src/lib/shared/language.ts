import { match } from 'ts-pattern';

type Language = 'ja' | 'ko' | 'en';

const LANGUAGES: readonly Language[] = ['ja', 'ko', 'en'];

const LANGUAGE_LEGEND = 'Language';

function languageName(language: Language): string {
  return match(language)
    .with('ja', () => 'Japanese')
    .with('ko', () => 'Korean')
    .with('en', () => 'English')
    .exhaustive();
}

export { LANGUAGES, LANGUAGE_LEGEND, languageName };
export type { Language };
