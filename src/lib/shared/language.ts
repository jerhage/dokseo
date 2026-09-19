export type Language = 'ja' | 'ko';

export const LANGUAGES: readonly Language[] = ['ja', 'ko'];

export function isLanguage(v: unknown): v is Language {
	return typeof v === 'string' && (LANGUAGES as readonly string[]).includes(v);
}
