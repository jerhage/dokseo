import type { SqlPatternsSectionKey } from './sql-patterns-sections';

type Recipe = {
  readonly want: string;
  readonly use: string;
  readonly section: SqlPatternsSectionKey;
};

const RECIPES: readonly Recipe[] = [
  {
    want: 'a list and each item’s children',
    use: 'one JOIN, or one batch query with IN',
    section: 'nPlusOne',
  },
  {
    want: 'the numbers a screen shows',
    use: 'a projection with GROUP BY and aggregates',
    section: 'projection',
  },
  {
    want: 'counts from two child tables',
    use: 'one subquery per child table',
    section: 'fanOut',
  },
  {
    want: 'groups whose totals pass a test',
    use: 'WHERE for rows, HAVING for groups',
    section: 'whereHaving',
  },
  {
    want: 'several counts in one pass',
    use: 'COUNT(*) FILTER (WHERE …), or COUNT(CASE …)',
    section: 'conditional',
  },
  { want: 'to know whether a row exists', use: 'EXISTS (SELECT 1 …)', section: 'exists' },
  { want: 'rows with no match', use: 'NOT EXISTS', section: 'noMatch' },
  { want: 'the top N rows per group', use: 'ROW_NUMBER() in a subquery', section: 'topN' },
  {
    want: 'a running total',
    use: 'SUM() OVER (ORDER BY … ROWS …)',
    section: 'running',
  },
  { want: 'a label computed from a value', use: 'CASE', section: 'label' },
  {
    want: 'one row per value or per group',
    use: 'DISTINCT, or ROW_NUMBER() = 1',
    section: 'dedupe',
  },
  { want: 'two lists as one', use: 'UNION ALL, or UNION', section: 'combine' },
  {
    want: 'a name for each step of a long query',
    use: 'WITH name AS (…), a common table expression',
    section: 'cte',
  },
  {
    want: 'one intermediate result used twice',
    use: 'a CTE referenced twice',
    section: 'cteSteps',
  },
  {
    want: 'control over whether a CTE runs once',
    use: 'MATERIALIZED or NOT MATERIALIZED',
    section: 'cteCost',
  },
  {
    want: 'every row below or above a node in a tree',
    use: 'WITH RECURSIVE',
    section: 'recursive',
  },
  {
    want: 'a row for every day, even days with no data',
    use: 'a counting WITH RECURSIVE, or generate_series in Postgres',
    section: 'series',
  },
  {
    want: 'to choose where an intermediate result lives',
    use: 'a subquery, a CTE, a view or a temporary table',
    section: 'cteChoice',
  },
];

export { RECIPES };
export type { Recipe };
