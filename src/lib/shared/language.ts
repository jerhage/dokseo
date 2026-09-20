import { match } from 'ts-pattern';

export type Language = 'ja' | 'ko';

export const LANGUAGES: readonly Language[] = ['ja', 'ko'];

export function languageName(language: Language): string {
  return match(language)
    .with('ja', () => 'Japanese')
    .with('ko', () => 'Korean')
    .exhaustive();
}
