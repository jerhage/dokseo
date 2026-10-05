import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { ARCHITECTURE_SECTIONS } from '../architecture/architecture-sections';
import { EPUB_SECTIONS } from '../epub-rendering/epub-sections';
import { OFFLINE_SECTIONS } from '../offline/sections';
import { STORAGE_SECTIONS } from '../storage/storage-sections';
import { TOUCH_SECTIONS } from '../touch-and-pointers/sections';
import { UI_LIBRARY_SECTIONS } from '../ui-library/sections';

const TESTING_SECTIONS = {
  reach: 'What a test can reach',
  expectation: 'A test is an expectation, run',
  doubles: 'Fakes, stubs and mocks',
  regression: 'A regression test fails first',
  mutation: 'Mutation checks',
  drift: 'Drift tests',
  flaky: 'Flaky tests and real failures',
  projects: "Vitest's two projects",
  choosing: 'Unit by default, browser for a seen bug',
  names: 'A test name says what the subject does',
  viewModels: 'Logic in view models',
  runes: 'Runes in the Node project',
  queries: 'Queries in a unit test',
  source: 'Specs that read the source',
  ladder: 'The verify ladder',
  probes: 'Probes against a built app',
  lessons: 'Failures that changed the tests',
  rule: 'Rules for writing a test',
} as const;

type TestingSectionKey = keyof typeof TESTING_SECTIONS;

function testingHref(key: TestingSectionKey): string {
  return `#${anchorSlug(TESTING_SECTIONS[key])}`;
}

const ARCHITECTURE_PORTS_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.ports)}`;

const ARCHITECTURE_VIEW_MODELS_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.viewModels)}`;

const ARCHITECTURE_RULES_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.rules)}`;

const ARCHITECTURE_QUERIES_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.queries)}`;

const ARCHITECTURE_REHEARSAL_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.rehearsal)}`;

const UI_RULES_HREF = `/docs/ui-library#${anchorSlug(UI_LIBRARY_SECTIONS.rules)}`;

const EPUB_LOCK_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.lock)}`;

const OFFLINE_TESTING_HREF = `/docs/offline#${anchorSlug(OFFLINE_SECTIONS.testing)}`;

const STORAGE_OPFS_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.opfs)}`;

const TOUCH_ZONES_HREF = `/docs/touch-and-pointers#${anchorSlug(TOUCH_SECTIONS.zones)}`;

const TOUCH_SETTINGS_HREF = `/docs/touch-and-pointers#${anchorSlug(TOUCH_SECTIONS.settings)}`;

export {
  ARCHITECTURE_PORTS_HREF,
  ARCHITECTURE_QUERIES_HREF,
  ARCHITECTURE_REHEARSAL_HREF,
  ARCHITECTURE_RULES_HREF,
  ARCHITECTURE_VIEW_MODELS_HREF,
  EPUB_LOCK_HREF,
  OFFLINE_TESTING_HREF,
  STORAGE_OPFS_HREF,
  TESTING_SECTIONS,
  TOUCH_SETTINGS_HREF,
  TOUCH_ZONES_HREF,
  UI_RULES_HREF,
  testingHref,
};
export type { TestingSectionKey };
