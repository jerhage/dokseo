<script lang="ts">
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import SqlQuery from '../sql-set-theory/SqlQuery.svelte';
  import { SQL_EXAMPLES } from '../../../domain/sql-examples';
  import { sqlSetPageHref } from '../sql-set-theory/sql-set-sections';
  import { SQL_PATTERNS_SECTIONS } from './sql-patterns-sections';

  const NO_MATCH_FORMS = [
    {
      form: 'NOT EXISTS (SELECT 1 … WHERE p.user_id = u.id)',
      nulls: 'Correct',
      note: 'Says what it means; Postgres 14 planned it as an anti-join here.',
    },
    {
      form: 'LEFT JOIN … WHERE p.id IS NULL',
      nulls: 'Correct',
      note: 'Test a column that cannot be NULL in a real match, such as the key.',
    },
    {
      form: 'NOT IN (SELECT p.user_id …)',
      nulls: 'No rows at all',
      note: 'Safe only when the list cannot hold NULL.',
    },
  ];
</script>

<DocsSection title={SQL_PATTERNS_SECTIONS.exists}>
  <p>
    A badge shows whether each user has published anything. The question is yes or no, so ask it as
    yes or no with <code>EXISTS</code>:
  </p>
  <SqlQuery example={SQL_EXAMPLES.existsColumn} label="Has each user published a post?" />
  <p>
    SQLite prints the answer as <code>1</code> or <code>0</code>; Postgres returns a boolean,
    <code>true</code> or <code>false</code>. For one user, the same test runs on its own:
  </p>
  <div class="grid-2 items-start">
    <SqlQuery example={SQL_EXAMPLES.existsOne} label="Does user 1 have a post?" />
    <SqlQuery example={SQL_EXAMPLES.countOne} label="How many posts does user 1 have?" />
  </div>
  <p>
    The count also answers "is it more than zero", and that is the reason not to use it for the yes
    or no question. <code>COUNT</code> has to find every matching row before it can return, while
    the Postgres documentation says an <code>EXISTS</code> subquery generally runs only long enough to
    find one row. For a user with three posts the difference is nothing; for a user with three million
    it is the whole scan. Use the count when the number is the answer.
  </p>
  <p>
    Inside <code>EXISTS</code>, the select list is never read, which is why the convention is
    <code>SELECT 1</code>.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('semi')}>Semi-joins: EXISTS and IN</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.noMatch}>
  <p>
    Find the users who have never posted. Three forms look equivalent, and on these tables one of
    them returns nothing, because the guest post has no author:
  </p>
  <SqlQuery example={SQL_EXAMPLES.antiJoinNotExists} label="Users with no post, NOT EXISTS" />
  <Table size="sm" caption="Three ways to ask for rows with no match">
    <TableHeader>
      <TableRow>
        <TableHeaderCell scope="col">Form</TableHeaderCell>
        <TableHeaderCell scope="col">With a NULL in the other table</TableHeaderCell>
        <TableHeaderCell scope="col">Note</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each NO_MATCH_FORMS as row (row.form)}
        <TableRow>
          <TableCell><code>{row.form}</code></TableCell>
          <TableCell>{row.nulls}</TableCell>
          <TableCell>{row.note}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    Use <code>NOT EXISTS</code>. The steps by which <code>NOT IN</code> loses every row are in
    <a href={sqlSetPageHref('notIn')}>NOT IN meets a NULL</a>.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('anti')}>Anti-joins: NOT EXISTS</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.topN}>
  <p>
    Show each user's two largest orders. <code>LIMIT 2</code> limits the whole result, not each user.
    Number the rows within each user instead, then keep the first two:
  </p>
  <SqlQuery example={SQL_EXAMPLES.topTwo} label="The two largest orders per user" />
  <p>
    <code>ROW_NUMBER()</code> counts 1, 2, 3 within each partition in the window's order. The filter
    sits outside, in a subquery, because a window function cannot appear in <code>WHERE</code>.
  </p>
  <p>
    Ties need a decision. Chen has two orders of 25, and ordering by <code>total DESC</code> alone
    leaves their order undefined, so which one is second could change from run to run. Adding
    <code>id</code> to the window's <code>ORDER BY</code> settles it. When ties should share a place,
    use a ranking function instead:
  </p>
  <SqlQuery example={SQL_EXAMPLES.rankings} label="Three ways to number Chen's orders" />
  <p>
    <code>RANK()</code> gives tied rows the same number and skips the next one;
    <code>DENSE_RANK()</code> gives them the same number and skips nothing. Filtering on
    <code>RANK() &lt;= 2</code> keeps every row tied for second place, so it can return more than two.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('windows')}>Window functions: group without collapsing</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.running}>
  <p>
    A chart plots revenue over time, so each order needs the sum of every order up to it. A window
    with an <code>ORDER BY</code> computes that, and its default frame has a catch:
  </p>
  <SqlQuery example={SQL_EXAMPLES.runningPeers} label="A running total with the default frame" />
  <p>
    Orders 3 and 7 share the date 2026-09-10, and both show 205. With an
    <code>ORDER BY</code> and no frame clause, the frame is
    <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>, and in <code>RANGE</code> mode
    the current row includes its <em>peers</em>, the rows with the same <code>ORDER BY</code> value. Both
    Postgres and SQLite document this default. So order 3's total already includes order 7. Order by something
    unique and count rows, not values:
  </p>
  <SqlQuery example={SQL_EXAMPLES.runningRows} label="A running total over rows" />
  <p>Add a partition for a running total per user:</p>
  <SqlQuery example={SQL_EXAMPLES.runningPerUser} label="A running total per user" />
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('windows')}>Window functions: group without collapsing</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.label}>
  <p>
    A list tags each order as large, medium or small. <code>CASE</code> computes the tag in the query,
    so every screen that shows it gets the same rule:
  </p>
  <SqlQuery example={SQL_EXAMPLES.label} label="A size label per order" />
  <p>
    The <code>WHEN</code> branches are tried top to bottom and the first true one wins, so an order
    of 60 is large and never reaches the medium test. Without an <code>ELSE</code>, a value that
    matches no branch gives <code>NULL</code>. Order the branches from the most specific test to the
    least.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('projection')}>Projection: SELECT and DISTINCT</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.dedupe}>
  <p>
    "Remove duplicates" means one of two things. The first is one row per distinct value, which is
    <code>DISTINCT</code>:
  </p>
  <SqlQuery example={SQL_EXAMPLES.distinctStatuses} label="The distinct order statuses" />
  <p>
    <code>DISTINCT</code> compares whole output rows, so with two columns it keeps each distinct pair:
  </p>
  <SqlQuery example={SQL_EXAMPLES.distinctPairs} label="The distinct user and status pairs" />
  <p>
    The second is one whole row per group, chosen by a rule, such as each user's newest post. That
    is the top N recipe with N = 1:
  </p>
  <SqlQuery example={SQL_EXAMPLES.latestPost} label="The newest post per user, ROW_NUMBER" />
  <p>
    Postgres has a shorter form, <code>DISTINCT ON</code>, which keeps the first row of each group
    in the query's <code>ORDER BY</code>. It is a Postgres extension to the SQL standard, and SQLite
    rejects it:
  </p>
  <SqlQuery example={SQL_EXAMPLES.distinctOn} label="The newest post per user, DISTINCT ON" />
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('projection')}>Projection: SELECT and DISTINCT</a>,
    <a href={sqlSetPageHref('windows')}>Window functions: group without collapsing</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.combine}>
  <p>
    A list needs the users who published a post or completed an order. <code>UNION</code> returns
    each id once; <code>UNION ALL</code> appends the lists and keeps every repeat:
  </p>
  <SqlQuery example={SQL_EXAMPLES.union} label="Authors or buyers, UNION" />
  <SqlQuery example={SQL_EXAMPLES.unionAll} label="Authors or buyers, UNION ALL" />
  <p>
    <code>UNION</code> pays for a sort or a hash to find the repeats. When the two sides cannot
    overlap, or the repeats are wanted, use <code>UNION ALL</code>.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('setOps')}>Union, intersection and difference</a>,
    <a href={sqlSetPageHref('unionAll')}>UNION ALL keeps every row</a>.
  </p>
</DocsSection>
