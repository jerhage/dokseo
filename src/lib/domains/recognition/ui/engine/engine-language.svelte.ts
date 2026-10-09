import type { Language } from '$lib/shared/language';
import { firstEngineLanguage } from './engine-setup';

function createEngineLanguage(onchange: () => void) {
  let language = $state.raw<Language>(firstEngineLanguage());

  return {
    get language(): Language {
      return language;
    },
    choose(next: Language): void {
      if (language === next) return;

      language = next;
      onchange();
    },
  };
}

type EngineLanguageHook = ReturnType<typeof createEngineLanguage>;

export { createEngineLanguage };
export type { EngineLanguageHook };
