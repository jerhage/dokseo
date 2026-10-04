import { NO_ERRORS, STRICT } from './compiled-example';
import type { CompiledExample } from './compiled-example';

const ALIASED_IDS: CompiledExample = {
  file: 'aliases.ts',
  flags: STRICT,
  code: `type BookId = string;
type TagId = string;

function openBook(id: BookId): void {}

const tag: TagId = 'tag-7';
openBook(tag);`,
  errors: NO_ERRORS,
};

const WIDER_ARRAY: CompiledExample = {
  file: 'arrays.ts',
  flags: STRICT,
  code: `const titles: string[] = ['Harbor Lights'];
const mixed: (string | number)[] = titles;

mixed.push(214);
titles[1].toUpperCase();`,
  errors: NO_ERRORS,
};

const FRESH_LITERAL: CompiledExample = {
  file: 'fresh.ts',
  flags: STRICT,
  code: `type Book = { readonly title: string };

const book: Book = { title: 'Harbor Lights', titel: 'Harbor Lights' };`,
  errors: `fresh.ts(3,46): error TS2561: Object literal may only specify known properties, but 'titel' does not exist in type 'Book'. Did you mean to write 'title'?`,
};

const STALE_LITERAL: CompiledExample = {
  file: 'stale.ts',
  flags: STRICT,
  code: `type Book = { readonly title: string };

const row = { title: 'Harbor Lights', titel: 'Harbor Lights' };
const book: Book = row;`,
  errors: NO_ERRORS,
};

const LITERAL_UNION: CompiledExample = {
  file: 'literals.ts',
  flags: STRICT,
  code: `type Language = 'ja' | 'ko' | 'en';

function languageName(language: Language): string {
  return language === 'ja' ? 'Japanese' : language === 'ko' ? 'Korean' : 'English';
}

languageName('ko');
languageName('fr');`,
  errors: `literals.ts(8,14): error TS2345: Argument of type '"fr"' is not assignable to parameter of type 'Language'.`,
};

const SHARED_FIELDS: CompiledExample = {
  file: 'intersection.ts',
  flags: STRICT,
  code: `type Shared = { readonly id: string; readonly text: string };
type Noted = { readonly note: string | null };

type NotedCapture = Shared & Noted;

const capture: NotedCapture = { id: 'c1', text: 'ありがとう', note: null };
const bare: NotedCapture = { id: 'c2', text: 'はい' };`,
  errors: `intersection.ts(7,7): error TS2322: Type '{ id: string; text: string; }' is not assignable to type 'NotedCapture'.
  Property 'note' is missing in type '{ id: string; text: string; }' but required in type 'Noted'.`,
};

const UNION_STATE: CompiledExample = {
  file: 'union.ts',
  flags: STRICT,
  code: `type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ready'; readonly titles: readonly string[] };

const shown: Load = {
  kind: 'failed',
  titles: ['Harbor Lights'],
};`,
  errors: `union.ts(8,3): error TS2353: Object literal may only specify known properties, and 'titles' does not exist in type '{ readonly kind: "failed"; readonly message: string; }'.`,
};

const WRITTEN_NOTE: CompiledExample = {
  file: 'written-note.ts',
  flags: STRICT,
  code: `type Shared = { readonly id: string; readonly text: string };

type Capture =
  | (Shared & { readonly origin: 'recognized'; readonly note: string | null })
  | (Shared & { readonly origin: 'written' });

const written: Capture = { id: 'c1', text: 'ありがとう', origin: 'written', note: 'thanks' };`,
  errors: `written-note.ts(7,72): error TS2353: Object literal may only specify known properties, and 'note' does not exist in type 'Shared & { readonly origin: "written"; }'.`,
};

const UNNARROWED_READ: CompiledExample = {
  file: 'unnarrowed.ts',
  flags: STRICT,
  code: `type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ready'; readonly titles: readonly string[] };

function count(load: Load): number {
  return load.titles.length;
}`,
  errors: `unnarrowed.ts(7,15): error TS2339: Property 'titles' does not exist on type 'Load'.
  Property 'titles' does not exist on type '{ readonly kind: "loading"; }'.`,
};

const NARROWED_READ: CompiledExample = {
  file: 'narrowed.ts',
  flags: STRICT,
  code: `type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ready'; readonly titles: readonly string[] };

function count(load: Load): number {
  if (load.kind !== 'ready') return 0;
  return load.titles.length;
}`,
  errors: NO_ERRORS,
};

const NARROWING_CHECKS: CompiledExample = {
  file: 'checks.ts',
  flags: STRICT,
  code: `type Anchor =
  | { readonly kind: 'region'; readonly regions: readonly number[] }
  | { readonly kind: 'text'; readonly cfi: string };

function described(value: string | Date | Anchor | null): string {
  if (value === null) return 'nothing';
  if (typeof value === 'string') return value.toUpperCase();
  if (value instanceof Date) return value.toISOString();
  if ('regions' in value) return \`\${value.regions.length} regions\`;
  return value.cfi;
}`,
  errors: NO_ERRORS,
};

const LYING_GUARD: CompiledExample = {
  file: 'guard.ts',
  flags: STRICT,
  code: `function isText(value: unknown): value is string {
  return typeof value === 'number';
}

const stored: unknown = 214;
if (isText(stored)) stored.toUpperCase();`,
  errors: NO_ERRORS,
};

const INFERRED_FILTER: CompiledExample = {
  file: 'filter.ts',
  flags: STRICT,
  code: `const parsed: unknown = JSON.parse('["ja", 7, "ko"]');

const kept: readonly string[] = Array.isArray(parsed)
  ? parsed.filter((entry) => typeof entry === 'string')
  : [];`,
  errors: NO_ERRORS,
};

const INCLUDES_GUARD: CompiledExample = {
  file: 'includes.ts',
  flags: STRICT,
  code: `type Language = 'ja' | 'ko' | 'en';

const LANGUAGES: readonly Language[] = ['ja', 'ko', 'en'];

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value);
}`,
  errors: `includes.ts(6,29): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Language'.`,
};

const SOME_GUARD: CompiledExample = {
  file: 'some.ts',
  flags: STRICT,
  code: `type Language = 'ja' | 'ko' | 'en';

const LANGUAGES: readonly Language[] = ['ja', 'ko', 'en'];

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}`,
  errors: NO_ERRORS,
};

const FLAG_STATE: CompiledExample = {
  file: 'flags.ts',
  flags: STRICT,
  code: `type Load = {
  readonly loading: boolean;
  readonly failed: boolean;
  readonly ready: boolean;
  readonly titles?: readonly string[];
  readonly message?: string;
};

const shown: Load = {
  loading: true,
  failed: true,
  ready: false,
  titles: ['Harbor Lights'],
};`,
  errors: NO_ERRORS,
};

const NEVER_SWITCH: CompiledExample = {
  file: 'switch.ts',
  flags: STRICT,
  code: `type Language = 'ja' | 'ko' | 'en' | 'zh';

function languageName(language: Language): string {
  switch (language) {
    case 'ja':
      return 'Japanese';
    case 'ko':
      return 'Korean';
    case 'en':
      return 'English';
    default: {
      const unhandled: never = language;
      return unhandled;
    }
  }
}`,
  errors: `switch.ts(12,13): error TS2322: Type '"zh"' is not assignable to type 'never'.`,
};

const EXHAUSTIVE_MATCH: CompiledExample = {
  file: 'matched.ts',
  flags: STRICT,
  code: `import { match } from 'ts-pattern';

type Language = 'ja' | 'ko' | 'en' | 'zh';

function languageName(language: Language): string {
  return match(language)
    .with('ja', () => 'Japanese')
    .with('ko', () => 'Korean')
    .with('en', () => 'English')
    .exhaustive();
}`,
  errors: `matched.ts(10,6): error TS2349: This expression is not callable.
  Type 'NonExhaustiveError<"zh">' has no call signatures.`,
};

const CONCEPT_EXAMPLES: readonly CompiledExample[] = [
  ALIASED_IDS,
  WIDER_ARRAY,
  FRESH_LITERAL,
  STALE_LITERAL,
  LITERAL_UNION,
  SHARED_FIELDS,
  UNION_STATE,
  WRITTEN_NOTE,
  UNNARROWED_READ,
  NARROWED_READ,
  NARROWING_CHECKS,
  LYING_GUARD,
  INFERRED_FILTER,
  INCLUDES_GUARD,
  SOME_GUARD,
  FLAG_STATE,
  NEVER_SWITCH,
  EXHAUSTIVE_MATCH,
];

export {
  ALIASED_IDS,
  CONCEPT_EXAMPLES,
  EXHAUSTIVE_MATCH,
  FLAG_STATE,
  FRESH_LITERAL,
  INCLUDES_GUARD,
  INFERRED_FILTER,
  LITERAL_UNION,
  LYING_GUARD,
  NARROWED_READ,
  NARROWING_CHECKS,
  NEVER_SWITCH,
  SHARED_FIELDS,
  SOME_GUARD,
  STALE_LITERAL,
  UNION_STATE,
  UNNARROWED_READ,
  WIDER_ARRAY,
  WRITTEN_NOTE,
};
