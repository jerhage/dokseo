<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import SqlQuery from './SqlQuery.svelte';
  import VennDiagram from './VennDiagram.svelte';
  import {
    CLAUSE_ORDER_DIAGRAM,
    PARTITION_DIAGRAM,
    WINDOW_DIAGRAM,
    sampleUsers,
    vennRegions,
  } from '../../../domain/sql-diagrams';
  import { SQL_EXAMPLES } from '../../../domain/sql-examples';
  import { sqlPatternsPageHref } from '../sql-patterns/sql-patterns-sections';
  import { SQL_SET_SECTIONS, sqlSetHref } from './sql-set-sections';
  import { OPERATOR_GLANCE } from './operator-glance';

  const regions = vennRegions(
    SQL_EXAMPLES.authors.rows.map((row) => row[0]),
    SQL_EXAMPLES.buyers.rows.map((row) => row[0]),
    sampleUsers(),
  );
</script>

<DocsSection title={SQL_SET_SECTIONS.setOps}>
  <p>
    Union, intersection and difference combine two sets of the same kind of element. In SQL both
    sides must return the same number of columns with compatible types. Take two lists of user ids:
    A, the authors of published posts, and B, the users with a completed order.
  </p>
  <div class="grid-2 items-start">
    <SqlQuery example={SQL_EXAMPLES.authors} label="A: authors of published posts" />
    <SqlQuery example={SQL_EXAMPLES.buyers} label="B: users with a completed order" />
  </div>
  <p>
    As sets, A is {'{'}1, 2{'}'} and B is {'{'}1, 3{'}'}. Alice (1) is in both, Bob (2) only in A,
    Chen (3) only in B, and Dana (4) in neither.
  </p>
  <p>
    <strong>Union</strong>, A ∪ B, holds what is in either: "A or B".
  </p>
  <Figure>
    <VennDiagram
      label="Union: both circles are shaded. Bob in A only, Alice in both, Chen in B only. Dana is outside both."
      leftName="A"
      rightName="B"
      {regions}
      shaded={['leftOnly', 'both', 'rightOnly']}
    />
  </Figure>
  <SqlQuery example={SQL_EXAMPLES.union} label="A UNION B" />
  <p>
    <strong>Intersection</strong>, A ∩ B, holds what is in both: "A and B".
  </p>
  <Figure>
    <VennDiagram
      label="Intersection: only the overlap is shaded, holding Alice."
      leftName="A"
      rightName="B"
      {regions}
      shaded={['both']}
    />
  </Figure>
  <SqlQuery example={SQL_EXAMPLES.intersect} label="A INTERSECT B" />
  <p>
    <strong>Difference</strong>, A \ B, holds what is in A and not in B: "A but not B". Unlike the
    other two, it changes when the sides swap.
  </p>
  <div class="grid-2 items-start">
    <Figure>
      <VennDiagram
        label="A minus B: the part of A outside B is shaded, holding Bob."
        leftName="A"
        rightName="B"
        {regions}
        shaded={['leftOnly']}
      />
    </Figure>
    <Figure>
      <VennDiagram
        label="B minus A: the part of B outside A is shaded, holding Chen."
        leftName="A"
        rightName="B"
        {regions}
        shaded={['rightOnly']}
      />
    </Figure>
  </div>
  <SqlQuery example={SQL_EXAMPLES.except} label="A EXCEPT B" />
  <SqlQuery example={SQL_EXAMPLES.exceptReversed} label="B EXCEPT A" />
  <p>
    Dana, in neither list, is the part of the users outside both circles: the users minus the union.
    The same picture is a common way to draw joins, and it misleads there. A Venn diagram shows
    which elements are kept; a join builds new rows from pairs, and Alice's three posts become three
    rows, which no circle shows. The <a href={sqlSetHref('joins')}>pairs drawing</a> is the honest one
    for joins.
  </p>
  <p>
    Some databases, Oracle among them, call <code>EXCEPT</code> <code>MINUS</code>. MySQL added
    <code>INTERSECT</code> and <code>EXCEPT</code> in 8.0.31.
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.unionAll}>
  <p>
    The three operators return sets: they remove duplicate rows, including duplicates that came from
    one side alone. A held Alice twice and B held her twice, and the union above holds her once. For
    this purpose two <code>NULL</code>s count as equal.
  </p>
  <p>
    <code>UNION ALL</code> is the bag version. It appends one result to the other and removes nothing:
  </p>
  <SqlQuery example={SQL_EXAMPLES.unionAll} label="A UNION ALL B" />
  <p>
    Removing duplicates costs a sort or a hash over the whole result, so when the two sides cannot
    overlap, or repeats are wanted, <code>UNION ALL</code> is the cheaper choice; the Postgres
    manual says to use <code>ALL</code> when you can. Postgres also has <code>INTERSECT ALL</code>
    and
    <code>EXCEPT ALL</code>, which keep counts; SQLite rejects both with a syntax error.
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.grouping}>
  <p>
    A <em>partition</em> of a set splits it into groups, so that every element lands in exactly one
    group.
    <code>GROUP BY user_id</code> partitions the orders by their user, and an aggregate function
    then reduces each group to one value: <code>COUNT</code> its size, <code>SUM</code>,
    <code>AVG</code>, <code>MIN</code> and <code>MAX</code> its values. Each group becomes one row.
  </p>
  <Figure>
    <Diagram {...PARTITION_DIAGRAM} />
    {#snippet caption()}
      Eight orders, three groups, three result rows. Each order is in exactly one group.
    {/snippet}
  </Figure>
  <SqlQuery example={SQL_EXAMPLES.groupBy} label="Orders grouped by user" />
  <p>
    After grouping, the query has groups, not orders, so a plain <code>total</code> in the
    <code>SELECT</code> list would ask for one value from a group that holds several. Postgres
    rejects it with
    <code
      >column "orders.total" must appear in the GROUP BY clause or be used in an aggregate function</code
    >, unless the column depends on the grouping columns, as every column of a table does when its
    primary key is grouped. SQLite accepts it as a "bare" column and takes its value from one of the
    group's rows, which its documentation says is usually undefined; with exactly one
    <code>MIN</code> or <code>MAX</code> in the query, the row holding that minimum or maximum.
  </p>
  <p>
    Dana has no orders, so she has no group; a partition of the orders cannot contain an empty
    group. Rows with a <code>NULL</code> key do get one. Grouping the posts by author puts the guest
    post in a group whose key is <code>NULL</code>, which SQLite sorts first and Postgres last:
  </p>
  <SqlQuery example={SQL_EXAMPLES.groupByNull} label="Posts grouped by author" />
  <p>
    <code>HAVING</code> filters the groups after aggregation, as <code>WHERE</code> filters rows
    before it. <a href={sqlPatternsPageHref('whereHaving')}>Filter rows, then filter groups</a> shows
    the difference in numbers.
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.windows}>
  <p>
    Sometimes each row needs a value computed over its group while staying a row of its own: each
    order next to its user's total, for example. <code>GROUP BY</code> cannot do it, because it
    collapses each group into one row. A <em>window function</em> computes over the same partition
    and leaves the rows alone. <code>OVER (PARTITION BY user_id)</code> names the partition:
  </p>
  <Figure>
    <Diagram {...WINDOW_DIAGRAM} />
    {#snippet caption()}
      The same three partitions as above. Every order stays a row and gets its partition's total.
    {/snippet}
  </Figure>
  <SqlQuery example={SQL_EXAMPLES.window} label="Each order with its user's total" />
  <p>
    Compare the result with the grouped one: three rows there, eight here, and the totals agree.
    Adding <code>ORDER BY</code> inside <code>OVER</code> turns the window into a running
    computation within each partition, which is how ranking and running totals work (<a
      href={sqlPatternsPageHref('topN')}>Keep the top N per group</a
    >,
    <a href={sqlPatternsPageHref('running')}>Running totals</a>).
  </p>
  <p>
    SQLite has had window functions since 3.25.0. The Postgres manual allows them only in the
    <code>SELECT</code> list and in <code>ORDER BY</code>, because they logically run after
    <code>WHERE</code>, <code>GROUP BY</code> and <code>HAVING</code>. To filter on one, compute it
    in a subquery and filter outside.
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.clauseOrder}>
  <p>
    A query is written <code>SELECT</code> first, but it is not evaluated in that order. The
    Postgres reference for <code>SELECT</code> describes the processing in this order:
  </p>
  <Figure>
    <Diagram {...CLAUSE_ORDER_DIAGRAM} />
    {#snippet caption()}
      The logical order of a query. A database may run it differently, as long as the result is the
      same.
    {/snippet}
  </Figure>
  <p>
    The order explains rules that otherwise look arbitrary. <code>WHERE</code> cannot use an
    aggregate, because groups do not exist yet when it runs. A window function cannot appear in
    <code>WHERE</code> for the same reason. And an alias defined in the <code>SELECT</code> list
    does not exist yet in <code>WHERE</code> or <code>HAVING</code>, which the Postgres manual
    states directly: an output column's name can be used in <code>ORDER BY</code> and
    <code>GROUP BY</code>, not in <code>WHERE</code> or <code>HAVING</code>.
  </p>
  <SqlQuery example={SQL_EXAMPLES.havingAlias} label="An alias used in HAVING" />
  <p>
    SQLite accepts that query and returns the rows above. Postgres rejects it with
    <code>column "spent" does not exist</code>. Writing <code>HAVING SUM(total) &gt;= 50</code> works
    in both.
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.compose}>
  <p>
    The set view pays off when a question has several conditions. Take "users who published a post,
    have at least two orders, and have no pending order". Name each condition as a set of users
    first:
  </p>
  <DocsCode
    code={'A = users with a published post\nB = users with a pending order\nC = users with at least two orders\n\nresult = (A ∩ C) \\ B'}
    label="The question as sets"
  />
  <p>
    Then each set becomes a condition on each user: ∈ A is <code>EXISTS</code>, ∉ B is
    <code>NOT EXISTS</code>, ∈ C is a count, and ∩ is <code>AND</code>.
  </p>
  <SqlQuery example={SQL_EXAMPLES.composedExists} label="The composed question with EXISTS" />
  <p>The same definition can be written with the set operators directly, each line one set:</p>
  <SqlQuery example={SQL_EXAMPLES.composedSets} label="The composed question with set operators" />
  <p>
    The order of those lines matters across databases. Postgres and MySQL evaluate
    <code>INTERSECT</code> before <code>UNION</code> and <code>EXCEPT</code>, while SQLite groups
    every compound operator from left to right. Written as A <code>INTERSECT</code> C
    <code>EXCEPT</code> B, both readings are (A ∩ C) \ B. Written as A <code>EXCEPT</code> B
    <code>INTERSECT</code> C, Postgres would compute A \ (B ∩ C) and SQLite (A \ B) ∩ C, which are different
    sets in general.
  </p>
  <p>
    Either way, the work went into defining the set. The procedural version, fetch the users, loop,
    fetch each one's posts and orders, check, keep, describes how to find the answer; the query
    describes the answer, and the database chooses how to find it.
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.glance}>
  <Table size="sm" caption="Set operations and their SQL">
    <TableHeader>
      <TableRow>
        <TableHeaderCell scope="col">Idea</TableHeaderCell>
        <TableHeaderCell scope="col">Notation</TableHeaderCell>
        <TableHeaderCell scope="col">SQL</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each OPERATOR_GLANCE as row (row.idea)}
        <TableRow>
          <TableCell><a href={sqlSetHref(row.section)}>{row.idea}</a></TableCell>
          <TableCell>{row.notation}</TableCell>
          <TableCell><code>{row.sql}</code></TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</DocsSection>
