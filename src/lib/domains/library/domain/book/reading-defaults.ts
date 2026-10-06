import { match } from 'ts-pattern';
import { isLanguage } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import { isPagePairingChoice, isReadingDirection } from '$lib/shared/layout-kind';
import type {
  ImageLayoutKind,
  LayoutKind,
  PagePairingChoice,
  ReadingDirection,
} from '$lib/shared/layout-kind';
import { DEFAULT_PAGE_PAIRING } from './book';

type LanguageDefaults = {
  readonly direction: ReadingDirection;
  readonly layoutKind: ImageLayoutKind;
  readonly pagePairing: PagePairingChoice;
};

type ReadingDefaults = {
  readonly language: Language;
  readonly languages: Readonly<Record<Language, LanguageDefaults>>;
};

type DeclaredReading = {
  readonly language: Language | null;
  readonly direction: ReadingDirection | null;
  readonly layoutKind: LayoutKind | null;
};

type NewBookReading = {
  readonly language: Language;
  readonly direction: ReadingDirection;
  readonly layoutKind: LayoutKind;
  readonly pagePairing: PagePairingChoice;
};

const UNDETECTED_LANGUAGE: Language = 'ja';

const IMAGE_BOOK_DIRECTION: ReadingDirection = 'rtl';

const IMAGE_BOOK_LAYOUT: ImageLayoutKind = 'paged';

const IMAGE_LAYOUT_KINDS: readonly ImageLayoutKind[] = ['paged', 'continuous'];

function isImageLayoutKind(value: unknown): value is ImageLayoutKind {
  return IMAGE_LAYOUT_KINDS.some((kind) => kind === value);
}

function initialLanguageDefaults(language: Language): LanguageDefaults {
  const today: LanguageDefaults = {
    direction: IMAGE_BOOK_DIRECTION,
    layoutKind: IMAGE_BOOK_LAYOUT,
    pagePairing: DEFAULT_PAGE_PAIRING,
  };

  return match(language)
    .returnType<LanguageDefaults>()
    .with('ja', () => today)
    .with('ko', () => today)
    .with('en', () => today)
    .exhaustive();
}

function eachLanguage(
  defaultsOf: (language: Language) => LanguageDefaults,
): Readonly<Record<Language, LanguageDefaults>> {
  return { ja: defaultsOf('ja'), ko: defaultsOf('ko'), en: defaultsOf('en') };
}

const INITIAL_READING_DEFAULTS: ReadingDefaults = {
  language: UNDETECTED_LANGUAGE,
  languages: eachLanguage(initialLanguageDefaults),
};

function fieldOf(stored: unknown, field: string): unknown {
  if (typeof stored !== 'object' || stored === null) return undefined;

  return Object.entries(stored).find(([key]) => key === field)?.[1];
}

function languageDefaultsFromStored(stored: unknown, language: Language): LanguageDefaults {
  const initial = initialLanguageDefaults(language);
  const direction = fieldOf(stored, 'direction');
  const layoutKind = fieldOf(stored, 'layoutKind');
  const pagePairing = fieldOf(stored, 'pagePairing');

  return {
    direction: isReadingDirection(direction) ? direction : initial.direction,
    layoutKind: isImageLayoutKind(layoutKind) ? layoutKind : initial.layoutKind,
    pagePairing: isPagePairingChoice(pagePairing) ? pagePairing : initial.pagePairing,
  };
}

function readingDefaultsFromStored(stored: unknown): ReadingDefaults {
  const language = fieldOf(stored, 'language');
  const languages = fieldOf(stored, 'languages');

  return {
    language: isLanguage(language) ? language : INITIAL_READING_DEFAULTS.language,
    languages: eachLanguage((each) =>
      languageDefaultsFromStored(fieldOf(languages, each), each),
    ),
  };
}

function withDefaultLanguage(defaults: ReadingDefaults, language: Language): ReadingDefaults {
  return { ...defaults, language };
}

function withLanguageDefaults(
  defaults: ReadingDefaults,
  language: Language,
  chosen: LanguageDefaults,
): ReadingDefaults {
  return { ...defaults, languages: { ...defaults.languages, [language]: chosen } };
}

function newBookReading(
  declared: DeclaredReading,
  guessedLanguage: Language | null,
  defaults: ReadingDefaults,
): NewBookReading {
  const language = declared.language ?? guessedLanguage ?? defaults.language;
  const filled = defaults.languages[language];

  return {
    language,
    direction: declared.direction ?? filled.direction,
    layoutKind: declared.layoutKind ?? filled.layoutKind,
    pagePairing: filled.pagePairing,
  };
}

export {
  INITIAL_READING_DEFAULTS,
  initialLanguageDefaults,
  newBookReading,
  readingDefaultsFromStored,
  withDefaultLanguage,
  withLanguageDefaults,
};
export type { DeclaredReading, LanguageDefaults, NewBookReading, ReadingDefaults };
