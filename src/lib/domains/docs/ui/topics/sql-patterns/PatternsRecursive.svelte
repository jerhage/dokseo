<script lang="ts">
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import SqlQuery from '../sql-set-theory/SqlQuery.svelte';
  import SqlResult from '../sql-set-theory/SqlResult.svelte';
  import { SQL_CATEGORY_SCHEMA, SQL_EXAMPLES, SQL_TABLES } from '../../../domain/sql-examples';
  import { sqlSetPageHref } from '../sql-set-theory/sql-set-sections';
  import { SQL_PATTERNS_SECTIONS, sqlPatternsHref } from './sql-patterns-sections';

  const HOLDERS = [
    {
      kind: 'Subquery',
      lives: 'One place in one statement',
      reuse: 'Written out again for each use',
      index: 'No',
      planner: 'Planned with the outer query',
      choose: 'A short step used once',
    },
    {
      kind: 'CTE',
      lives: 'One statement',
      reuse: 'By name, any number of times in that statement',
      index: 'No',
      planner:
        'Inlined or computed once; MATERIALIZED and NOT MATERIALIZED in Postgres 12+ and SQLite 3.35+',
      choose: 'A query of several steps, a result used twice in one statement, recursion',
    },
    {
      kind: 'View',
      lives: 'In the schema until dropped',
      reuse: 'By name, from any query',
      index: 'No, a view stores no rows',
      planner: 'Its query runs each time the view is referenced',
      choose: 'A definition that many queries share',
    },
    {
      kind: 'Temporary table',
      lives: 'The session, or in Postgres optionally the transaction',
      reuse: 'From any statement in that session',
      index: 'Yes',
      planner: 'A real table with its own rows; Postgres needs a manual ANALYZE for statistics',
      choose: 'Rows that several statements read, or that need an index',
    },
  ];
</script>

<DocsSection title={SQL_PATTERNS_SECTIONS.recursive}>
  <p>
    A shop sorts its books into categories, and a category can sit inside another one. The sample
    tables get one more table for this, where each row names its parent, and a top-level category
    has none:
  </p>
  <DocsCode code={SQL_CATEGORY_SCHEMA} label="The categories table" />
  <SqlResult
    columns={SQL_TABLES.categories.columns}
    rows={SQL_TABLES.categories.rows}
    caption="categories"
  />
  <p>
    Listing every category under Books takes one join per level, and the number of levels is not
    known in advance. A <em>recursive</em> CTE refers to its own name, so it can repeat the join until
    nothing is left:
  </p>
  <SqlQuery example={SQL_EXAMPLES.subtree} label="Every category under Books" />
  <p>
    The body of a recursive CTE has two parts joined by <code>UNION ALL</code>. The first, the
    <em>anchor</em>, does not mention <code>tree</code> and gives the starting rows. The second, the
    <em>recursive part</em>, joins <code>categories</code> to <code>tree</code> and gives the next level.
    The Postgres manual describes the evaluation in these steps:
  </p>
  <StepList>
    <StepItem title="Run the anchor">
      <p>
        It returns Books, at depth 0. The row goes into the result and into a <em>working table</em
        >.
      </p>
    </StepItem>
    <StepItem title="Run the recursive part on the working table">
      <p>
        <code>tree</code> now means only the working table, Books, so the join finds the children of Books:
        Comics and Novels, at depth 1. They go into the result and replace the working table.
      </p>
    </StepItem>
    <StepItem title="Repeat">
      <p>
        The children of Comics and Novels are Manga and Webtoons, at depth 2. The children of those
        are Shonen, at depth 3.
      </p>
    </StepItem>
    <StepItem title="Stop on an empty working table">
      <p>
        Shonen has no children, so the next run returns no rows, the working table is empty, and the
        recursion ends.
      </p>
    </StepItem>
  </StepList>
  <p>
    SQLite documents a different procedure, a queue that the recursive part reads one row at a time,
    and it returns the same rows here. The <code>path</code> column builds each category's chain of
    names as the recursion goes down, and ordering by it lists every category under its parent.
    Without an <code>ORDER BY</code>, the rows come back in no promised order, as on any query.
  </p>
  <p>The same pattern walks up instead, from a category to the top, for a breadcrumb:</p>
  <SqlQuery example={SQL_EXAMPLES.ancestors} label="From Shonen up to the top" />
  <p>
    The recursion ends only when a level returns no rows. If the data has a cycle, say Manga's
    parent set to Shonen by mistake, the walk up from Shonen goes Shonen, Manga, Shonen, Manga,
    every level finds another row, and the query never finishes. Replacing
    <code>UNION ALL</code> with <code>UNION</code> discards rows that repeat an earlier row, and the
    Postgres manual suggests it for this, but here every row has a new <code>depth</code>, so no row
    repeats. Guards that do work:
  </p>
  <ul>
    <li>
      A depth limit in the recursive part, such as <code>WHERE t.depth &lt; 20</code>, which works
      in every database.
    </li>
    <li>
      The <code>CYCLE</code> clause, added in Postgres 14, which marks a row that revisits a key and recurses
      no further from it.
    </li>
    <li>
      MySQL's <code>cte_max_recursion_depth</code>, 1000 by default, which ends a deeper recursion
      with an error.
    </li>
  </ul>
  <p>
    Some limits apply to the recursive part. SQLite and MySQL reject aggregate and window functions
    in it, and MySQL also rejects <code>GROUP BY</code>, <code>ORDER BY</code> and
    <code>DISTINCT</code> there. Group and rank in the final <code>SELECT</code>, after the
    recursion. MySQL also takes each column's type from the anchor alone, and its manual shows a
    string that grows in the recursive part cut to the anchor's length in nonstrict mode; a
    <code>CAST</code> in the anchor makes the column wide enough.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('unionAll')}>UNION ALL keeps every row</a>,
    <a href={sqlSetPageHref('joins')}>A join is a filtered product</a>,
    <a href={sqlSetPageHref('order')}>Rows have no order</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.series}>
  <p>
    A recursive CTE needs no table at all. An anchor of one number and a recursive part that adds 1
    count up, and the <code>WHERE</code> in the recursive part ends the count:
  </p>
  <SqlQuery example={SQL_EXAMPLES.counter} label="The numbers 1 to 5" />
  <p>
    When the recursive part reaches 5, <code>n &lt; 5</code> is false, the recursive part returns
    nothing, and the recursion stops. That makes a series a building block. A chart of orders per
    day needs a row for every day, but grouping <code>orders</code> by date gives no row for a day without
    orders. Generate the days, then left join the orders to them:
  </p>
  <SqlQuery example={SQL_EXAMPLES.dailyOrders} label="Orders per day, empty days included" />
  <p>
    <code>date(day, '+1 day')</code> is SQLite's date arithmetic, and the dates are compared as
    text, which works because the ISO format sorts in date order. The <code>LEFT JOIN</code> keeps
    the days with no order, <code>COUNT(o.id)</code> gives them 0, and <code>COALESCE</code> turns
    their <code>NULL</code> sum into 0. Postgres has a function for the series,
    <code>generate_series</code>, which returns the same rows:
  </p>
  <SqlQuery example={SQL_EXAMPLES.dailyOrdersSeries} label="Orders per day with generate_series" />
  <p>
    SQLite's core has no <code>generate_series</code>: it is a loadable extension compiled into the
    command-line shell, so a program using the SQLite library cannot count on it. The recursive form
    runs in all three databases, with each one's date arithmetic in the recursive part.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('outer')}>Outer joins: LEFT and FULL</a>,
    <a href={sqlSetPageHref('grouping')}>GROUP BY is a partition</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.cteChoice}>
  <p>
    A subquery, a CTE, a view and a temporary table all hold the rows of an intermediate query. They
    differ in how long the definition lives, who can reuse it, and whether its rows are stored:
  </p>
  <Table size="sm" caption="Where an intermediate result can live">
    <TableHeader>
      <TableRow>
        <TableHeaderCell scope="col">Form</TableHeaderCell>
        <TableHeaderCell scope="col">Lives for</TableHeaderCell>
        <TableHeaderCell scope="col">Reuse</TableHeaderCell>
        <TableHeaderCell scope="col">Index</TableHeaderCell>
        <TableHeaderCell scope="col">Planner</TableHeaderCell>
        <TableHeaderCell scope="col">Choose it for</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each HOLDERS as row (row.kind)}
        <TableRow>
          <TableCell>{row.kind}</TableCell>
          <TableCell>{row.lives}</TableCell>
          <TableCell>{row.reuse}</TableCell>
          <TableCell>{row.index}</TableCell>
          <TableCell>{row.planner}</TableCell>
          <TableCell>{row.choose}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    A view is a named query stored in the schema; the Postgres manual for <code>CREATE VIEW</code>
    says a view is not physically materialized and its query runs every time the view is referenced. A
    temporary table stores rows: Postgres drops it at the end of the session, or of the transaction with
    <code>ON COMMIT DROP</code>, and SQLite keeps it in a separate temporary database that only the
    creating connection can see and that is deleted when the connection closes. Because Postgres's
    autovacuum cannot reach temporary tables, its manual advises running
    <code>ANALYZE</code> on one after filling it, before using it in complex queries.
  </p>
  <p>
    The choice follows the scope. A step used once inside one query is a subquery, or a CTE when a
    name makes the query easier to read, as in
    <a href={sqlPatternsHref('cte')}>Name a subquery with WITH</a>. Steps that build on each other,
    a result used twice, and a tree or a series are CTEs. A definition shared by many queries is a
    view. Rows that several statements read, or that need an index, are a temporary table.
  </p>
</DocsSection>
