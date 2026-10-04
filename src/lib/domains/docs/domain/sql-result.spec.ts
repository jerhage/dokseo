import { describe, expect, it } from 'vitest';
import { numericColumns, planText, rowCountLabel } from './sql-result';

describe('numericColumns', () => {
  it('marks a column numeric when every value but NULL is a number', () => {
    expect(
      numericColumns(
        [
          ['Alice', 3, null],
          ['Dana', null, null],
        ],
        3,
      ),
    ).toEqual([false, true, false]);
  });
});

describe('rowCountLabel', () => {
  it('names one row in the singular and any other count in the plural', () => {
    expect([rowCountLabel(0), rowCountLabel(1), rowCountLabel(5)]).toEqual([
      '0 rows',
      '1 row',
      '5 rows',
    ]);
  });
});

describe('planText', () => {
  it('joins the first column of each plan row into lines and keeps the indentation', () => {
    expect(planText([['CTE Scan on spending'], ['  Filter: (user_id = 1)']])).toBe(
      'CTE Scan on spending\n  Filter: (user_id = 1)',
    );
  });
});
