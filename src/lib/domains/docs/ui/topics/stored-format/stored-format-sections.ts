import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { EXPORT_IMPORT_SECTIONS } from '../export-import/export-import-sections';
import { IDENTITY_SECTIONS } from '../book-identity/sections';
import { INDEXEDDB_SECTIONS } from '../indexeddb/indexeddb-sections';
import { RELEASE_SECTIONS } from '../releases-and-ci/sections';
import { SERIES_PLAN_SECTIONS } from '../series-plan/series-sections';
import { TESTING_SECTIONS } from '../testing/testing-sections';

const STORED_FORMAT_SECTIONS = {
  promise: 'What a stored-format promise is',
  strands: 'How a format change strands data',
  options: 'Lenient reads, or strict reads and migrations',
  scope: 'What the 1.x promise covers',
  databases: 'Databases, stores and indexes',
  checks: 'One check per field',
  books: 'Book rows',
  pageLists: 'Page lists',
  removed: 'Removed-book records',
  captures: 'Capture rows',
  tags: 'Tag rows',
  files: 'Book files in OPFS',
  file: 'The captures file v1',
  golden: 'The golden file',
  unreadable: 'Unreadable rows and the way out',
  damage: 'Damaging a fixture',
  pins: 'Specs that pin the format',
  changing: 'Changing the format after 1.0',
  rule: 'Rules for the stored format',
} as const;

type StoredFormatSectionKey = keyof typeof STORED_FORMAT_SECTIONS;

function storedFormatHref(key: StoredFormatSectionKey): string {
  return `#${anchorSlug(STORED_FORMAT_SECTIONS[key])}`;
}

const SERIES_OLD_TAB_HREF = `/docs/series-plan#${anchorSlug(SERIES_PLAN_SECTIONS.oldTab)}`;

const SERIES_VERSIONS_HREF = `/docs/series-plan#${anchorSlug(SERIES_PLAN_SECTIONS.versions)}`;

const RELEASES_SEMVER_HREF = `/docs/releases-and-ci#${anchorSlug(RELEASE_SECTIONS.semver)}`;

const RELEASES_BREAKING_HREF = `/docs/releases-and-ci#${anchorSlug(RELEASE_SECTIONS.breaking)}`;

const INDEXEDDB_UPGRADES_HREF = `/docs/indexeddb#${anchorSlug(INDEXEDDB_SECTIONS.upgrades)}`;

const INDEXEDDB_INDEXES_HREF = `/docs/indexeddb#${anchorSlug(INDEXEDDB_SECTIONS.indexes)}`;

const IDENTITY_PARTIAL_HREF = `/docs/book-identity#${anchorSlug(IDENTITY_SECTIONS.partial)}`;

const IDENTITY_LADDER_HREF = `/docs/book-identity#${anchorSlug(IDENTITY_SECTIONS.ladder)}`;

const IDENTITY_MERGE_HREF = `/docs/book-identity#${anchorSlug(IDENTITY_SECTIONS.merge)}`;

const EXPORT_FORMAT_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.format)}`;

const EXPORT_STRICT_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.strict)}`;

const EXPORT_FIRST_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.exportFirst)}`;

const TESTING_DRIFT_HREF = `/docs/testing#${anchorSlug(TESTING_SECTIONS.drift)}`;

export {
  EXPORT_FIRST_HREF,
  EXPORT_FORMAT_HREF,
  EXPORT_STRICT_HREF,
  IDENTITY_LADDER_HREF,
  IDENTITY_MERGE_HREF,
  IDENTITY_PARTIAL_HREF,
  INDEXEDDB_INDEXES_HREF,
  INDEXEDDB_UPGRADES_HREF,
  RELEASES_BREAKING_HREF,
  RELEASES_SEMVER_HREF,
  SERIES_OLD_TAB_HREF,
  SERIES_VERSIONS_HREF,
  STORED_FORMAT_SECTIONS,
  TESTING_DRIFT_HREF,
  storedFormatHref,
};
export type { StoredFormatSectionKey };
