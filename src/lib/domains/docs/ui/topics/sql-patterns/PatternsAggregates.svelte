<script lang="ts">
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import SqlQuery from '../sql-set-theory/SqlQuery.svelte';
  import { SQL_EXAMPLES } from '../../../domain/sql-examples';
  import { sqlSetPageHref } from '../sql-set-theory/sql-set-sections';
  import { RECIPES } from './recipes';
  import { SQL_PATTERNS_SECTIONS, sqlPatternsHref } from './sql-patterns-sections';

  const N_PLUS_ONE = `users = query("SELECT id, name FROM users ORDER BY id")
for user in users:
  user.posts = query(
    "SELECT id, title FROM posts WHERE user_id = ? ORDER BY id",
    user.id,
  )`;

  const QUERY_COUNTS = [
    { approach: 'A query per user', queries: '1 + N', four: '5', thousand: '1,001' },
    { approach: 'One JOIN', queries: '1', four: '1', thousand: '1' },
    { approach: 'A batch with IN', queries: '2', four: '2', thousand: '2' },
  ];
</script>

<DocsSection title={SQL_PATTERNS_SECTIONS.index}>
  <p>
    Each recipe below answers one common need with the query that fits it, runs it on the sample
    tables from <a href={sqlSetPageHref('relations')}>SQL as set theory</a>, and links back to the
    set operation underneath it.
  </p>
  <Table size="sm" caption="If you want this, use that">
    <TableHeader>
      <TableRow>
        <TableHeaderCell scope="col">If you want</TableHeaderCell>
        <TableHeaderCell scope="col">Use</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each RECIPES as recipe (recipe.section)}
        <TableRow>
          <TableCell><a href={sqlPatternsHref(recipe.section)}>{recipe.want}</a></TableCell>
          <TableCell>{recipe.use}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.nPlusOne}>
  <p>
    A screen lists users with their posts. The first version usually loads the users, then loops
    over them and loads each user's posts:
  </p>
  <DocsCode code={N_PLUS_ONE} label="One query, then a query per user" />
  <SqlQuery example={SQL_EXAMPLES.nPlusOneUsers} label="The first query" />
  <SqlQuery example={SQL_EXAMPLES.nPlusOnePosts} label="The query for user 1, one of four" />
  <p>
    For N users that is 1 + N queries, the <em>N+1 problem</em>. With a client/server database such
    as Postgres or MySQL, each query is a message to the server and an answer back, and those round
    trips run one after another. A page that takes a millisecond per round trip spends a second on a
    thousand users before it does anything else.
  </p>
  <p>
    The cure is to stop asking from inside the loop. One way is a join, which returns every pair in
    one result:
  </p>
  <SqlQuery example={SQL_EXAMPLES.leftJoin} label="Users and posts in one query" />
  <p>
    The join repeats each user's columns on every post row, and the code groups the rows back into
    users. A <code>LEFT JOIN</code> keeps Dana, who has no posts. The other way is a batch: load the
    users, collect their ids, and load all their posts with one <code>IN</code> list:
  </p>
  <SqlQuery example={SQL_EXAMPLES.batchPosts} label="Every user's posts in one batch" />
  <p>
    The batch costs one more query than the join and repeats nothing; the code matches posts to
    users by <code>user_id</code>. Either way the number of queries stops growing with the number of
    users:
  </p>
  <Table size="sm" caption="Queries per page load">
    <TableHeader>
      <TableRow>
        <TableHeaderCell scope="col">Approach</TableHeaderCell>
        <TableHeaderCell scope="col" numeric>Queries</TableHeaderCell>
        <TableHeaderCell scope="col" numeric>4 users</TableHeaderCell>
        <TableHeaderCell scope="col" numeric>1,000 users</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each QUERY_COUNTS as row (row.approach)}
        <TableRow>
          <TableCell>{row.approach}</TableCell>
          <TableCell numeric>{row.queries}</TableCell>
          <TableCell numeric>{row.four}</TableCell>
          <TableCell numeric>{row.thousand}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The cost is the round trip, so it depends on the database. SQLite runs inside the application's
    process, and its documentation, in "Many Small Queries Are Efficient In SQLite", says a query
    there is a function call with no message round trip, so many small queries are not the problem
    they are for a server.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('joins')}>A join is a filtered product</a>,
    <a href={sqlSetPageHref('semi')}>Semi-joins: EXISTS and IN</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.projection}>
  <p>
    A dashboard shows each user with a post count and the date of the latest post. Loading every
    post to count them in code moves all the rows to compute four numbers. A query can return the
    four numbers:
  </p>
  <SqlQuery example={SQL_EXAMPLES.dashboard} label="One row per user, ready for the screen" />
  <p>
    The <code>LEFT JOIN</code> keeps Dana, and <code>COUNT(p.id)</code> gives her 0.
    <code>COUNT(*)</code> would count rows, and Dana has one row, the one the left join filled with
    <code>NULL</code>:
  </p>
  <SqlQuery example={SQL_EXAMPLES.dashboardCountStar} label="The same query counting rows" />
  <p>
    <code>COUNT(column)</code> counts the rows where that column is not <code>NULL</code>, so
    counting the right table's key counts real matches. <code>MAX</code> over no values returns
    <code>NULL</code>, which is the honest answer for Dana's latest post.
  </p>
  <p>
    A result like this need not match any table. It is a read model: rows built for one screen,
    combining tables and computed values, while the tables keep the form that suits writing. The
    name projection fits it loosely; in the algebra a projection only drops columns, and here the
    <code>SELECT</code> list also computes new ones.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('projection')}>Projection: SELECT and DISTINCT</a>,
    <a href={sqlSetPageHref('grouping')}>GROUP BY is a partition</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.fanOut}>
  <p>
    Extend the dashboard with order counts and spending, joining both child tables at once, and the
    numbers go wrong:
  </p>
  <SqlQuery example={SQL_EXAMPLES.fanOut} label="Two child tables joined at once" />
  <p>Alice has 3 posts and 3 orders, not 9 of each. Follow her rows through the query:</p>
  <ol>
    <li>Joining posts gives three rows for Alice, one per post.</li>
    <li>
      Joining orders to each of those rows gives three rows per post, one per order: nine rows.
    </li>
    <li>
      <code>COUNT</code> and <code>SUM</code> then see every post three times and every order three times.
      Her spending, 95, becomes 285.
    </li>
  </ol>
  <p>
    Each join multiplies the rows by the number of matches, so two independent one-to-many joins
    produce every combination of a post with an order. <code>COUNT(DISTINCT …)</code> repairs the counts,
    and it is tempting to repair the sum the same way:
  </p>
  <SqlQuery example={SQL_EXAMPLES.fanOutDistinct} label="The same query with DISTINCT" />
  <p>
    The counts are right now, but Chen's spending reads 65 instead of 90: his two orders of 25 are
    distinct orders with the same total, and <code>SUM(DISTINCT total)</code> adds 25 once. Aggregate
    each child table on its own instead, so nothing multiplies:
  </p>
  <SqlQuery example={SQL_EXAMPLES.fanOutFixed} label="One subquery per child table" />
  <p>
    When each child table contributes several columns, join against one grouped subquery per child
    table instead. Each subquery has at most one row per user, so the joins cannot multiply
    anything:
  </p>
  <SqlQuery example={SQL_EXAMPLES.fanOutGrouped} label="One grouped subquery per child table" />
  <p>
    Dana's <code>NULL</code> in <code>spent</code> comes from <code>SUM</code> over no rows in the
    correlated form and from the left join in the grouped form. <code>COALESCE(…, 0)</code> turns it into
    0 where the screen needs a number, as the grouped form does for the counts.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('joins')}>A join is a filtered product</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.whereHaving}>
  <p>
    Find the users whose completed orders add up to at least 50. That has a condition on rows, the
    status, and a condition on groups, the sum. <code>WHERE</code> filters rows before grouping;
    <code>HAVING</code> filters groups after it:
  </p>
  <SqlQuery example={SQL_EXAMPLES.whereThenHaving} label="Filter rows, then groups" />
  <p>
    Drop the <code>WHERE</code> and the sum includes canceled and pending orders, so every user passes:
  </p>
  <SqlQuery example={SQL_EXAMPLES.havingOnly} label="Filter groups only" />
  <p>
    A condition that does not need an aggregate belongs in <code>WHERE</code>: the rows it removes
    are never grouped, and an index can help find the rest. Write the aggregate itself in
    <code>HAVING</code> rather than its alias, which Postgres rejects there.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('grouping')}>GROUP BY is a partition</a>,
    <a href={sqlSetPageHref('clauseOrder')}>The order a query is evaluated in</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.conditional}>
  <p>
    A report needs, per user, the number of orders, how many completed, how many were canceled, and
    the completed revenue. Four queries would do it, or one pass with <code>FILTER</code>, which
    feeds an aggregate only the rows where its condition is true:
  </p>
  <SqlQuery example={SQL_EXAMPLES.filterCounts} label="Counts with FILTER" />
  <p>
    Postgres supports <code>FILTER</code>, and SQLite has since 3.30.0. MySQL's aggregate function
    reference documents no <code>FILTER</code> clause. The portable form puts a
    <code>CASE</code> inside the aggregate:
  </p>
  <SqlQuery example={SQL_EXAMPLES.caseCounts} label="Counts with CASE" />
  <p>
    The <code>CASE</code> has no <code>ELSE</code>, so a row that does not match gives
    <code>NULL</code>, and <code>COUNT</code> and <code>SUM</code> skip <code>NULL</code>. Bob has
    no completed orders, so his revenue is the sum of nothing, <code>NULL</code> in both forms.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('grouping')}>GROUP BY is a partition</a>.
  </p>
</DocsSection>
