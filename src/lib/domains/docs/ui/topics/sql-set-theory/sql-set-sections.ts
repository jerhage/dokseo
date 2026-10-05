import { anchorSlug } from '$lib/ui/components/table-of-contents';

const SQL_SET_SECTIONS = {
  relations: 'Tables as relations',
  bags: 'Duplicates: SQL works on bags',
  nulls: 'NULL and three-valued logic',
  order: 'Rows have no order',
  selection: 'Selection: WHERE',
  projection: 'Projection: SELECT and DISTINCT',
  product: 'The Cartesian product',
  joins: 'A join is a filtered product',
  outer: 'Outer joins: LEFT and FULL',
  semi: 'Semi-joins: EXISTS and IN',
  anti: 'Anti-joins: NOT EXISTS',
  notIn: 'NOT IN meets a NULL',
  setOps: 'Union, intersection and difference',
  unionAll: 'UNION ALL keeps every row',
  grouping: 'GROUP BY is a partition',
  windows: 'Window functions: group without collapsing',
  clauseOrder: 'The order a query is evaluated in',
  compose: 'Define the set, then write the query',
  glance: 'Operators at a glance',
} as const;

type SqlSetSectionKey = keyof typeof SQL_SET_SECTIONS;

function sqlSetHref(key: SqlSetSectionKey): string {
  return `#${anchorSlug(SQL_SET_SECTIONS[key])}`;
}

const SQL_SET_PAGE_HREF = '/docs/sql-set-theory';

function sqlSetPageHref(key: SqlSetSectionKey): string {
  return `${SQL_SET_PAGE_HREF}${sqlSetHref(key)}`;
}

export { SQL_SET_PAGE_HREF, SQL_SET_SECTIONS, sqlSetHref, sqlSetPageHref };
export type { SqlSetSectionKey };
