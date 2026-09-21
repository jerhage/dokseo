import type { Language } from '$lib/shared/language';

const HANGUL = /[가-힣ᄀ-ᇿ㄰-㆏]/u;

const KANA = /[぀-ゟ゠-ヿ]/u;

function languageOfTitle(title: string): Language | null {
  if (HANGUL.test(title)) return 'ko';
  if (KANA.test(title)) return 'ja';

  return null;
}

export { languageOfTitle };
