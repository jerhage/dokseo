import { anchorSlug } from '$lib/components/table-of-contents';
import { ARCHITECTURE_SECTIONS } from '../architecture/architecture-sections';
import { IDENTITY_SECTIONS } from '../book-identity/sections';
import { EXPORT_IMPORT_SECTIONS } from '../export-import/export-import-sections';
import { INDEXEDDB_SECTIONS } from '../indexeddb/indexeddb-sections';
import { OFFLINE_SECTIONS } from '../offline/sections';
import { RELEASE_SECTIONS } from '../releases-and-ci/sections';
import { STORAGE_SECTIONS } from '../storage/storage-sections';

const SERIES_PLAN_SECTIONS = {
  reader: 'What a series means to a reader',
  identity: 'Identity and grouping',
  breaking: 'Why changing stored data can break a reader',
  versions: 'Compatibility through database versions',
  oldTab: 'An old tab across a deploy',
  formats: 'Series in book files',
  built: 'What is built before 1.0',
  read: 'A strict read, and a save of the edited book',
  reserved: 'Two reserved fields',
  carried: 'Removal, restore and export',
  reference: 'A series id, not a series name',
  store: 'A series store later',
  assignment: 'Assigning books to a series',
  volume: 'Volume as a number',
  shelf: 'The shelf and the next volume',
  exportFile: 'The export file stays at version 1',
  owner: 'The library domain owns series',
  remaining: 'What remains to build',
  edges: 'Known edges',
  order: 'Order of work',
} as const;

type SeriesPlanSectionKey = keyof typeof SERIES_PLAN_SECTIONS;

function seriesPlanHref(key: SeriesPlanSectionKey): string {
  return `#${anchorSlug(SERIES_PLAN_SECTIONS[key])}`;
}

const ARCHITECTURE_GRAPH_HREF = `/docs/architecture#${anchorSlug(ARCHITECTURE_SECTIONS.graph)}`;

const RELEASES_BREAKING_HREF = `/docs/releases-and-ci#${anchorSlug(RELEASE_SECTIONS.breaking)}`;

const STORAGE_ROWS_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.rows)}`;

const OFFLINE_UPDATES_HREF = `/docs/offline#${anchorSlug(OFFLINE_SECTIONS.updates)}`;

const INDEXEDDB_TABS_HREF = `/docs/indexeddb#${anchorSlug(INDEXEDDB_SECTIONS.tabs)}`;

const IDENTITY_SAME_HREF = `/docs/book-identity#${anchorSlug(IDENTITY_SECTIONS.same)}`;

const IDENTITY_LADDER_HREF = `/docs/book-identity#${anchorSlug(IDENTITY_SECTIONS.ladder)}`;

const IDENTITY_REMOVED_HREF = `/docs/book-identity#${anchorSlug(IDENTITY_SECTIONS.removed)}`;

const IDENTITY_UNREADABLE_HREF = `/docs/book-identity#${anchorSlug(IDENTITY_SECTIONS.unreadable)}`;

const EXPORT_IDS_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.ids)}`;

const EXPORT_VERSIONS_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.versions)}`;

const EXPORT_FORMAT_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.format)}`;

export {
  ARCHITECTURE_GRAPH_HREF,
  EXPORT_FORMAT_HREF,
  EXPORT_IDS_HREF,
  EXPORT_VERSIONS_HREF,
  IDENTITY_LADDER_HREF,
  IDENTITY_REMOVED_HREF,
  IDENTITY_SAME_HREF,
  IDENTITY_UNREADABLE_HREF,
  INDEXEDDB_TABS_HREF,
  OFFLINE_UPDATES_HREF,
  RELEASES_BREAKING_HREF,
  SERIES_PLAN_SECTIONS,
  STORAGE_ROWS_HREF,
  seriesPlanHref,
};
export type { SeriesPlanSectionKey };
