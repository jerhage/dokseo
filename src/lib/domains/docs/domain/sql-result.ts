import type { SqlRow } from './sql-examples';

function numericColumns(rows: readonly SqlRow[], width: number): readonly boolean[] {
  return Array.from({ length: width }, (_, index) => {
    const values = rows.map((row) => row[index]).filter((value) => value !== null);
    return values.length > 0 && values.every((value) => typeof value === 'number');
  });
}

function rowCountLabel(count: number): string {
  return count === 1 ? '1 row' : `${count} rows`;
}

function planText(rows: readonly SqlRow[]): string {
  return rows.map((row) => String(row[0] ?? '')).join('\n');
}

export { numericColumns, planText, rowCountLabel };
