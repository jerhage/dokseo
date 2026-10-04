import type { SqlSetSectionKey } from './sql-set-sections';

type OperatorRow = {
  readonly idea: string;
  readonly notation: string;
  readonly sql: string;
  readonly section: SqlSetSectionKey;
};

const OPERATOR_GLANCE: readonly OperatorRow[] = [
  { idea: 'Keep some rows', notation: 'σ', sql: 'WHERE', section: 'selection' },
  { idea: 'Keep some columns', notation: 'π', sql: 'SELECT', section: 'projection' },
  { idea: 'Bag to set', notation: '', sql: 'DISTINCT', section: 'projection' },
  { idea: 'Every pair', notation: '×', sql: 'CROSS JOIN', section: 'product' },
  { idea: 'Matching pairs', notation: '⋈', sql: 'JOIN … ON', section: 'joins' },
  { idea: 'Keep unmatched rows', notation: '⟕ ⟗', sql: 'LEFT JOIN, FULL JOIN', section: 'outer' },
  { idea: 'Has a match', notation: '⋉', sql: 'EXISTS, IN', section: 'semi' },
  { idea: 'Has no match', notation: '▷', sql: 'NOT EXISTS', section: 'anti' },
  { idea: 'In either', notation: '∪', sql: 'UNION', section: 'setOps' },
  { idea: 'In both', notation: '∩', sql: 'INTERSECT', section: 'setOps' },
  { idea: 'In the first only', notation: '\\', sql: 'EXCEPT', section: 'setOps' },
  { idea: 'Append, keep repeats', notation: '', sql: 'UNION ALL', section: 'unionAll' },
  { idea: 'Partition and reduce', notation: '', sql: 'GROUP BY, COUNT, SUM', section: 'grouping' },
  { idea: 'Keep some groups', notation: '', sql: 'HAVING', section: 'grouping' },
  {
    idea: 'Compute over a group, keep the rows',
    notation: '',
    sql: 'OVER (PARTITION BY …)',
    section: 'windows',
  },
];

export { OPERATOR_GLANCE };
export type { OperatorRow };
