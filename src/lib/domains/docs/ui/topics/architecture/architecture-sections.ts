import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { EPUB_SECTIONS } from '../epub-rendering/epub-sections';
import { EXPORT_IMPORT_SECTIONS } from '../export-import/export-import-sections';
import { OCR_SECTIONS } from '../ocr/ocr-sections';
import { STORAGE_SECTIONS } from '../storage/storage-sections';
import { UI_LIBRARY_SECTIONS } from '../ui-library/sections';

const ARCHITECTURE_SECTIONS = {
  direction: 'Which way an import points',
  ports: 'Ports and adapters',
  root: 'The composition root',
  useCases: 'One use case per operation',
  failures: 'Expected and unexpected failures',
  exhaustive: 'Exhaustive matching',
  domains: 'Domains and an acyclic graph',
  tools: 'Rules a tool checks',
  cache: 'A query cache for local data',
  tree: "Dokseo's layers",
  container: 'container.ts and composition/',
  parts: 'The parts of a domain',
  graph: "Dokseo's domain graph",
  rules: 'The rules in .dependency-cruiser.cjs',
  barrels: 'No barrel files',
  rehearsal: 'A use case with a fake port',
  path: 'From a tap to IndexedDB and back',
  queries: 'Reads and writes through TanStack Query',
  languages: 'Recognizers loaded per language',
  viewModels: 'View models in .svelte.ts files',
  casts: 'No as casts, with two exceptions',
  limits: 'What the rules do not reach',
  rule: 'Rules for changing the code',
} as const;

type ArchitectureSectionKey = keyof typeof ARCHITECTURE_SECTIONS;

function architectureHref(key: ArchitectureSectionKey): string {
  return `#${anchorSlug(ARCHITECTURE_SECTIONS[key])}`;
}

const UI_DIRECTION_HREF = `/docs/ui-library#${anchorSlug(UI_LIBRARY_SECTIONS.direction)}`;

const OCR_PORT_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.port)}`;

const STORAGE_DATABASES_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.databases)}`;

const STORAGE_ACCOUNT_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.account)}`;

const EPUB_FLOWING_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.flowing)}`;

const IMPORT_PLAN_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.plan)}`;

export {
  ARCHITECTURE_SECTIONS,
  EPUB_FLOWING_HREF,
  IMPORT_PLAN_HREF,
  OCR_PORT_HREF,
  STORAGE_ACCOUNT_HREF,
  STORAGE_DATABASES_HREF,
  UI_DIRECTION_HREF,
  architectureHref,
};
export type { ArchitectureSectionKey };
