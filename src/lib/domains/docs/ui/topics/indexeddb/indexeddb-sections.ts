import { anchorSlug } from '$lib/components/table-of-contents';
import { EXPORT_IMPORT_SECTIONS } from '../export-import/export-import-sections';
import { IDENTITY_SECTIONS } from '../book-identity/sections';
import { sqlPatternsPageHref } from '../sql-patterns/sql-patterns-sections';
import { sqlSetPageHref } from '../sql-set-theory/sql-set-sections';
import { STORAGE_SECTIONS } from '../storage/storage-sections';
import { WORKERS_SECTIONS } from '../workers/workers-sections';

const INDEXEDDB_SECTIONS = {
  model: 'Databases, object stores and records',
  keys: 'Keys, key paths and generated keys',
  clones: 'Records are structured clones',
  indexes: 'Indexes',
  ranges: 'Key ranges and cursors',
  transactions: 'Transactions, scope and mode',
  autoCommit: 'Auto-commit, and the await that ends a transaction',
  upgrades: 'Version upgrades',
  errors: 'Errors and abort',
  missing: 'What IndexedDB does not have',
  join: 'A join is a lookup per key, or one batch',
  semi: 'Semi-joins and anti-joins with an index',
  count: 'Counting and grouping',
  sorting: 'Sorting through an index',
  denormalize: 'Denormalizing on purpose',
  databases: "Dokseo's databases, stores and indexes",
  helpers: 'One request, one transaction',
  move: 'Moving captures in one transaction',
  memory: 'Joins Dokseo does in memory',
  tabs: 'Blocked upgrades and VersionError',
  bumps: 'When Dokseo bumps a version',
  proxy: 'The $state proxy that put could not store',
  rule: 'Rules for IndexedDB code',
} as const;

type IndexedDbSectionKey = keyof typeof INDEXEDDB_SECTIONS;

function indexedDbHref(key: IndexedDbSectionKey): string {
  return `#${anchorSlug(INDEXEDDB_SECTIONS[key])}`;
}

const STORAGE_APIS_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.apis)}`;

const STORAGE_EVICTION_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.eviction)}`;

const STORAGE_DATABASES_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.databases)}`;

const STORAGE_ROWS_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.rows)}`;

const WORKERS_CLONE_HREF = `/docs/workers#${anchorSlug(WORKERS_SECTIONS.clone)}`;

const EXPORT_PROXY_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.proxy)}`;

const EXPORT_IDS_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.ids)}`;

const IDENTITY_UNREADABLE_HREF = `/docs/book-identity#${anchorSlug(IDENTITY_SECTIONS.unreadable)}`;

const IDENTITY_MERGE_HREF = `/docs/book-identity#${anchorSlug(IDENTITY_SECTIONS.merge)}`;

const SQL_JOINS_HREF = sqlSetPageHref('joins');

const SQL_SEMI_HREF = sqlSetPageHref('semi');

const SQL_ANTI_HREF = sqlSetPageHref('anti');

const SQL_GROUPING_HREF = sqlSetPageHref('grouping');

const SQL_PROJECTION_HREF = sqlSetPageHref('projection');

const SQL_N_PLUS_ONE_HREF = sqlPatternsPageHref('nPlusOne');

const SQL_EXISTS_HREF = sqlPatternsPageHref('exists');

const ASYNC_HREF = '/docs/async-correctness';

export {
  ASYNC_HREF,
  EXPORT_IDS_HREF,
  EXPORT_PROXY_HREF,
  IDENTITY_MERGE_HREF,
  IDENTITY_UNREADABLE_HREF,
  INDEXEDDB_SECTIONS,
  SQL_ANTI_HREF,
  SQL_EXISTS_HREF,
  SQL_GROUPING_HREF,
  SQL_JOINS_HREF,
  SQL_N_PLUS_ONE_HREF,
  SQL_PROJECTION_HREF,
  SQL_SEMI_HREF,
  STORAGE_APIS_HREF,
  STORAGE_DATABASES_HREF,
  STORAGE_EVICTION_HREF,
  STORAGE_ROWS_HREF,
  WORKERS_CLONE_HREF,
  indexedDbHref,
};
export type { IndexedDbSectionKey };
