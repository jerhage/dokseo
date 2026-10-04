import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { SQL_CATEGORY_SCHEMA, SQL_EXAMPLES, SQL_SCHEMA, SQL_TABLES } from './sql-examples';
import type { SqlExampleKey, SqlRow } from './sql-examples';

function sampleDatabase(): DatabaseSync {
  const database = new DatabaseSync(':memory:');
  database.exec(SQL_SCHEMA);
  database.exec(SQL_CATEGORY_SCHEMA);
  for (const table of Object.values(SQL_TABLES)) {
    const marks = table.columns.map(() => '?').join(', ');
    const insert = database.prepare(
      `INSERT INTO ${table.name} (${table.columns.join(', ')}) VALUES (${marks})`,
    );
    for (const row of table.rows) insert.run(...row);
  }
  return database;
}

function rowsOf(key: SqlExampleKey): readonly SqlRow[] {
  return SQL_EXAMPLES[key].rows;
}

function column(key: SqlExampleKey, name: string): readonly unknown[] {
  const columns: readonly string[] = SQL_EXAMPLES[key].columns;
  const index = columns.indexOf(name);
  return rowsOf(key).map((row) => row[index]);
}

const SQLITE_KEYS = Object.entries(SQL_EXAMPLES)
  .filter(([, example]) => example.engine === 'sqlite')
  .map(([key]) => key);

describe('the SQL examples', () => {
  it('gives every shown row one cell per column', () => {
    for (const example of Object.values(SQL_EXAMPLES)) {
      for (const row of example.rows) expect(row).toHaveLength(example.columns.length);
    }
    for (const table of Object.values(SQL_TABLES)) {
      for (const row of table.rows) expect(row).toHaveLength(table.columns.length);
    }
  });

  it.each(SQLITE_KEYS)('matches what SQLite returns for %s', (key) => {
    const example = Object.entries(SQL_EXAMPLES).find(([name]) => name === key)?.[1];
    const statement = sampleDatabase().prepare(example?.sql ?? '');
    statement.setReturnArrays(true);

    const rows = statement.all();

    expect(statement.columns().map((entry) => entry.name)).toEqual(example?.columns);
    expect(rows).toEqual(example?.rows);
  });

  it('counts one pair in the product for every user and every post', () => {
    expect(rowsOf('productSize')).toEqual([
      [SQL_TABLES.users.rows.length * SQL_TABLES.posts.rows.length],
    ]);
  });

  it('returns the same rows from a join and from a filtered product', () => {
    expect(rowsOf('filteredProduct')).toEqual(rowsOf('innerJoin'));
  });

  it('adds one row for the user with no post to the left join, and one for the post with no user to the full join', () => {
    expect(rowsOf('leftJoin')).toHaveLength(rowsOf('innerJoin').length + 1);
    expect(rowsOf('fullJoin')).toHaveLength(rowsOf('leftJoin').length + 1);
  });

  it('returns the same users from EXISTS and IN, and fewer rows than the join', () => {
    expect(rowsOf('semiJoinIn')).toEqual(rowsOf('semiJoinExists'));
    expect(rowsOf('joinRepeats').length).toBeGreaterThan(rowsOf('semiJoinExists').length);
  });

  it('agrees on the users with no post across every anti-join except NOT IN', () => {
    expect(rowsOf('antiJoinLeftJoin')).toEqual(rowsOf('antiJoinNotExists'));
    expect(rowsOf('antiJoinNotInFixed')).toEqual(rowsOf('antiJoinNotExists'));
    expect(rowsOf('antiJoinNotIn')).toEqual([]);
    expect(SQL_TABLES.posts.rows.some((row) => row[1] === null)).toBe(true);
  });

  it('keeps every row in UNION ALL and one of each in UNION', () => {
    expect(rowsOf('unionAll')).toHaveLength(rowsOf('authors').length + rowsOf('buyers').length);
    expect(column('union', 'user_id')).toEqual([...new Set(column('unionAll', 'user_id'))]);
  });

  it('builds the set operations from the two lists', () => {
    const authors = new Set(column('authors', 'user_id'));
    const buyers = new Set(column('buyers', 'user_id'));

    expect(column('intersect', 'user_id')).toEqual([...authors].filter((id) => buyers.has(id)));
    expect(column('except', 'user_id')).toEqual([...authors].filter((id) => !buyers.has(id)));
    expect(column('exceptReversed', 'user_id')).toEqual(
      [...buyers].filter((id) => !authors.has(id)),
    );
  });

  it('repeats each group total on every row of the window query', () => {
    const totals = new Map(rowsOf('groupBy').map((row) => [row[0], row[2]]));

    for (const row of rowsOf('window')) expect(row[3]).toBe(totals.get(row[1]));
    expect(rowsOf('window')).toHaveLength(SQL_TABLES.orders.rows.length);
  });

  it('agrees between the composed EXISTS query and the composed set query', () => {
    expect(column('composedExists', 'id')).toEqual(column('composedSets', 'user_id'));
  });

  it('counts the same with FILTER and with CASE', () => {
    expect(rowsOf('caseCounts')).toEqual(rowsOf('filterCounts'));
  });

  it('multiplies the counts when two child tables join at once', () => {
    const fixed = rowsOf('fanOutFixed');

    rowsOf('fanOut').forEach((row, index) => {
      const posts = Number(fixed[index]?.[1]);
      const orders = Number(fixed[index]?.[2]);
      expect(row[1]).toBe(posts * orders);
    });
  });

  it('returns the same numbers from correlated and grouped subqueries', () => {
    expect(rowsOf('fanOutGrouped')).toEqual(rowsOf('fanOutFixed'));
  });

  it('keeps at most two orders per user in the top two', () => {
    const users = column('topTwo', 'user_id');

    for (const user of new Set(users)) {
      expect(users.filter((id) => id === user).length).toBeLessThanOrEqual(2);
    }
  });

  it('ends both running totals at the sum of every order', () => {
    const sum = SQL_TABLES.orders.rows.reduce((total, row) => total + row[2], 0);

    expect(column('runningPeers', 'running').at(-1)).toBe(sum);
    expect(column('runningRows', 'running').at(-1)).toBe(sum);
  });

  it('returns the same newest post per user from ROW_NUMBER and from DISTINCT ON', () => {
    expect(rowsOf('distinctOn')).toEqual(rowsOf('latestPost'));
  });

  it('returns the same rows from a subquery in FROM and from the CTE that names it', () => {
    expect(rowsOf('spendingCte')).toEqual(rowsOf('spendingFromSubquery'));
    expect(rowsOf('rankedSteps')).toEqual(rowsOf('rankedNested'));
  });

  it('keeps every user in the correlated subquery, as a left join to the CTE does', () => {
    expect(rowsOf('spendingCteLeft')).toEqual(rowsOf('spendingCorrelated'));
    expect(rowsOf('spendingCorrelated')).toHaveLength(SQL_TABLES.users.rows.length);
    expect(rowsOf('spendingCte').length).toBeLessThan(rowsOf('spendingCorrelated').length);
  });

  it('returns the same users from the composed CTEs and the composed set query', () => {
    expect(rowsOf('composedCte')).toEqual(rowsOf('composedSets'));
  });

  it('returns the same rows with and without the MATERIALIZED hint', () => {
    expect(rowsOf('aboveAverageMaterialized')).toEqual(rowsOf('aboveAverage'));
  });

  it('reaches every category once from the root, and walks up from the leaf to the root', () => {
    expect(column('subtree', 'id').toSorted()).toEqual(
      SQL_TABLES.categories.rows.map((row) => row[0]),
    );
    expect(column('ancestors', 'name')).toEqual(['Books', 'Comics', 'Manga', 'Shonen']);
  });

  it('counts from 1 to 5 and gives every day a row, as generate_series does', () => {
    expect(column('counter', 'n')).toEqual([1, 2, 3, 4, 5]);
    expect(rowsOf('dailyOrdersSeries')).toEqual(rowsOf('dailyOrders'));
  });
});
