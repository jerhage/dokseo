import { anchorSlug } from '$lib/components/table-of-contents';

const SQL_PATTERNS_SECTIONS = {
  index: 'Find a recipe',
  nPlusOne: 'Load a list with its children',
  projection: 'Return exactly what the screen shows',
  fanOut: 'Count from two child tables',
  whereHaving: 'Filter rows, then filter groups',
  conditional: 'Count several conditions in one pass',
  exists: 'Check whether a matching row exists',
  noMatch: 'Find rows with no match',
  topN: 'Keep the top N per group',
  running: 'Running totals',
  label: 'Compute a label',
  dedupe: 'Remove duplicates',
  combine: 'Combine two lists',
  cte: 'Name a subquery with WITH',
  cteSteps: 'Write a query as named steps',
  cteCost: 'What a CTE costs',
  recursive: 'Walk a tree with WITH RECURSIVE',
  series: 'Generate a series of rows',
  cteChoice: 'CTE, subquery, view or temporary table',
} as const;

type SqlPatternsSectionKey = keyof typeof SQL_PATTERNS_SECTIONS;

function sqlPatternsHref(key: SqlPatternsSectionKey): string {
  return `#${anchorSlug(SQL_PATTERNS_SECTIONS[key])}`;
}

const SQL_PATTERNS_PAGE_HREF = '/docs/sql-patterns';

function sqlPatternsPageHref(key: SqlPatternsSectionKey): string {
  return `${SQL_PATTERNS_PAGE_HREF}${sqlPatternsHref(key)}`;
}

export { SQL_PATTERNS_PAGE_HREF, SQL_PATTERNS_SECTIONS, sqlPatternsHref, sqlPatternsPageHref };
export type { SqlPatternsSectionKey };
