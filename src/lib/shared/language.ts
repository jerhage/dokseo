import { match } from 'ts-pattern';

type Language = 'ja' | 'ko';

const LANGUAGES: readonly Language[] = ['ja', 'ko'];

function languageName(language: Language): string {
  return match(language)
    .with('ja', () => 'Japanese')
    .with('ko', () => 'Korean')
    .exhaustive();
}

export { LANGUAGES, languageName };
export type { Language };
