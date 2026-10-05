import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { OCR_SECTIONS } from '../ocr/ocr-sections';
import { BUILD_SECTIONS } from '../production-builds/build-sections';
import { SQL_SET_SECTIONS } from '../sql-set-theory/sql-set-sections';
import { TESTING_SECTIONS } from '../testing/testing-sections';
import { TYPE_SECTIONS } from '../typescript-types/type-sections';

const DRIFT_SECTIONS = {
  stale: 'How a code example goes stale',
  quote: 'Quote the code, do not retype it',
  list: 'A list of quotes per page',
  check: 'The check: is the quote still in the file',
  indentation: 'Why indentation is ignored',
  demo: 'Try the check',
  failure: 'What a failure looks like',
  moved: 'When the quoted file moves',
  ci: 'Where the check runs',
  recorded: 'Recorded output',
  sql: 'SQL results, run again in SQLite',
  tsc: 'Compiler errors, compiled again',
  svelte: 'Svelte compiler output',
  rolldown: 'Bundles, built again',
  build: 'The recorded build',
  ocrRun: 'The recorded OCR run',
  counts: 'Counts read from the list',
  limits: 'What the checks miss',
  self: 'The quotes on this page',
  rules: 'Rules for a docs example',
} as const;

type DriftSectionKey = keyof typeof DRIFT_SECTIONS;

function driftHref(key: DriftSectionKey): string {
  return `#${anchorSlug(DRIFT_SECTIONS[key])}`;
}

const TESTING_DRIFT_HREF = `/docs/testing#${anchorSlug(TESTING_SECTIONS.drift)}`;

const TESTING_LADDER_HREF = `/docs/testing#${anchorSlug(TESTING_SECTIONS.ladder)}`;

const TESTING_RUNES_HREF = `/docs/testing#${anchorSlug(TESTING_SECTIONS.runes)}`;

const SQL_JOINS_HREF = `/docs/sql-set-theory#${anchorSlug(SQL_SET_SECTIONS.joins)}`;

const TYPES_EXHAUSTIVE_HREF = `/docs/typescript-types#${anchorSlug(TYPE_SECTIONS.exhaustive)}`;

const BUILD_SHAKING_HREF = `/docs/production-builds#${anchorSlug(BUILD_SECTIONS.shaking)}`;

const BUILD_OUTPUT_HREF = `/docs/production-builds#${anchorSlug(BUILD_SECTIONS.dokseoOutput)}`;

const OCR_GREEDY_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.greedy)}`;

export {
  BUILD_OUTPUT_HREF,
  BUILD_SHAKING_HREF,
  DRIFT_SECTIONS,
  OCR_GREEDY_HREF,
  SQL_JOINS_HREF,
  TESTING_DRIFT_HREF,
  TESTING_LADDER_HREF,
  TESTING_RUNES_HREF,
  TYPES_EXHAUSTIVE_HREF,
  driftHref,
};
export type { DriftSectionKey };
