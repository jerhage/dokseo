import { match } from 'ts-pattern';

type Language = 'ja' | 'ko' | 'en';

const LANGUAGES: readonly Language[] = ['ja', 'ko', 'en'];

function languageName(language: Language): string {
  return match(language)
    .with('ja', () => 'Japanese')
    .with('ko', () => 'Korean')
    .with('en', () => 'English')
    .exhaustive();
}

export { LANGUAGES, languageName };
export type { Language };
