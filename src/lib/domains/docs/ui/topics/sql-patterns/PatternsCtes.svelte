<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import SqlQuery from '../sql-set-theory/SqlQuery.svelte';
  import { SQL_EXAMPLES } from '../../../domain/sql-examples';
  import { planText } from '../../../domain/sql-result';
  import { sqlSetPageHref } from '../sql-set-theory/sql-set-sections';
  import { SQL_PATTERNS_SECTIONS, sqlPatternsHref } from './sql-patterns-sections';
  import type { SqlExample } from '../../../domain/sql-examples';
</script>

{#snippet plan(example: SqlExample, label: string)}
  <div class="stack-sm">
    <DocsCode code={example.sql} {label} />
    <DocsCode code={planText(example.rows)} label="Postgres 14 plan" />
  </div>
{/snippet}

<DocsSection title={SQL_PATTERNS_SECTIONS.cte}>
  <p>
    A report lists each user with the total of their completed orders. The totals come from a
    grouped query over <code>orders</code>, and the names from <code>users</code>, so one query has
    to sit inside the other. The first way to write it puts the grouped query in
    <code>FROM</code>, as a subquery with an alias:
  </p>
  <SqlQuery example={SQL_EXAMPLES.spendingFromSubquery} label="A subquery in FROM" />
  <p>
    A <em>common table expression</em>, or CTE, is the same subquery moved in front of the statement
    and given a name. <code>WITH spending AS (…)</code> defines <code>spending</code>, and the rest
    of the statement uses it like a table:
  </p>
  <SqlQuery example={SQL_EXAMPLES.spendingCte} label="The same query with a CTE" />
  <p>
    The two return the same rows, because they are the same query: the CTE changes where the
    subquery is written, not what it computes. The name exists only inside this one statement.
  </p>
  <p>
    The third way asks for the total once per user, with a <em>correlated</em> subquery: one that
    refers to a column of the outer query, here <code>u.id</code>, so it is evaluated once for each
    user row, at least logically.
  </p>
  <SqlQuery example={SQL_EXAMPLES.spendingCorrelated} label="A correlated subquery" />
  <p>
    It returns four rows, not two. The outer query keeps every user, and for a user with no
    completed order, <code>SUM</code> over no rows is <code>NULL</code>, so Bob and Dana stay in the
    list with no total, where the join to the grouped subquery dropped them. The correlated form
    behaves like a <code>LEFT JOIN</code>, and the CTE written with one returns exactly its rows:
  </p>
  <SqlQuery example={SQL_EXAMPLES.spendingCteLeft} label="The CTE with a LEFT JOIN" />
  <p>
    A subquery used as a value must also return at most one row. Postgres stops with
    <code>more than one row returned by a subquery used as an expression</code> when it returns more;
    SQLite, in my run of the same query, used the first row and reported nothing.
  </p>
  <p>
    The difference between the three is in reading them. The subquery in <code>FROM</code> is read
    inside out: the middle of the statement runs first. The correlated subquery reads well for one
    value per row, and becomes one repeated subquery per column when the screen needs more, as in
    <a href={sqlPatternsHref('fanOut')}>Count from two child tables</a>. The CTE is read top to
    bottom, each name defined before it is used. Pick the join or the left join for the rows it
    keeps, then the form that reads best; for a subquery of more than a few lines, that is usually
    the CTE.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('joins')}>A join is a filtered product</a>,
    <a href={sqlSetPageHref('outer')}>Outer joins: LEFT and FULL</a>,
    <a href={sqlSetPageHref('grouping')}>GROUP BY is a partition</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.cteSteps}>
  <p>
    Rank the users by what they spent on orders that were not canceled. That is three steps: filter
    the orders, total them per user, rank the totals. Nested subqueries put the last step outside
    and the first step in the middle:
  </p>
  <DocsCode code={SQL_EXAMPLES.rankedNested.sql} label="Filter, total and rank, nested" />
  <p>
    One <code>WITH</code> can define several CTEs, separated by commas, and each one can use the CTEs
    defined before it. Written that way, the steps appear in the order they happen, each with a name:
  </p>
  <SqlQuery example={SQL_EXAMPLES.rankedSteps} label="Filter, total and rank, as named steps" />
  <p>
    Both versions return these three rows. Alice and Chen tie at 50, so <code>RANK()</code> gives
    both second place. Each step can also be checked alone, by putting its name in the final
    <code>SELECT</code>: <code>SELECT * FROM spending</code> shows the totals before the ranking.
  </p>
  <p>
    A name also lets one result appear twice. To list the users who spent more than the average
    user, the per-user totals are needed twice: once as the rows to filter, and once to compute the
    average. Without a CTE, the grouped subquery would be written out twice:
  </p>
  <SqlQuery example={SQL_EXAMPLES.aboveAverage} label="One CTE referenced twice" />
  <p>The totals are 95, 75 and 90, the average is 86.67, and Alice and Chen are above it.</p>
  <p>
    The same style turns the sets of <a href={sqlSetPageHref('compose')}
      >Define the set, then write the query</a
    > into a query that reads like their definition, one named set per CTE and the set operators at the
    end:
  </p>
  <SqlQuery example={SQL_EXAMPLES.composedCte} label="The composed question as named sets" />
  <p>
    Name a CTE for what its rows are, such as <code>spending</code> or <code>authors</code>, not for
    the step number, so the final <code>SELECT</code> reads as a sentence.
  </p>
  <p class="text-sm text-muted">
    Set view: <a href={sqlSetPageHref('compose')}>Define the set, then write the query</a>,
    <a href={sqlSetPageHref('setOps')}>Union, intersection and difference</a>,
    <a href={sqlSetPageHref('windows')}>Window functions: group without collapsing</a>.
  </p>
</DocsSection>

<DocsSection title={SQL_PATTERNS_SECTIONS.cteCost}>
  <p>
    A CTE looks like a table, and it is easy to treat it as one. It is not stored anywhere: it
    exists while its statement runs, the next statement that needs it computes it again, and an
    index cannot be created on it. When several statements need the same intermediate rows, or the
    rows need an index, use a temporary table, compared in
    <a href={sqlPatternsHref('cteChoice')}>CTE, subquery, view or temporary table</a>.
  </p>
  <p>
    A database can <em>inline</em> a CTE, substituting the CTE's query wherever the name appears, as
    if it were a subquery written there, and optimize the whole statement together. Or it can
    <em>materialize</em> it: run the CTE's query first, keep the rows, and read them at each reference.
    Inlining lets a condition from the outer query reach the CTE's table; materializing computes the rows
    once however many references there are.
  </p>
  <p>
    Postgres before version 12 always materialized. Its manual for version 11 says the optimizer is
    less able to push restrictions from the parent query down into a <code>WITH</code> query than
    into an ordinary subquery, so a CTE was an <em>optimization fence</em>. Since version 12, a
    <code>WITH</code> query that is not recursive and has no side effects is folded into the parent
    query when the parent references it once, and computed separately when it references it more
    than once. Two keywords override the default: <code>MATERIALIZED</code> forces the separate
    computation, and <code>NOT MATERIALIZED</code> forces the inlining. The difference shows in the plan.
    Here is a CTE referenced once, filtered to one user:
  </p>
  {@render plan(SQL_EXAMPLES.planInlined, 'A CTE referenced once')}
  <p>
    There is no CTE in the plan: the condition <code>user_id = 1</code> reached the scan of
    <code>orders</code>, so only Alice's orders are grouped. With <code>MATERIALIZED</code>, the
    fence is back:
  </p>
  {@render plan(SQL_EXAMPLES.planMaterialized, 'The same CTE, MATERIALIZED')}
  <p>
    Now the CTE groups every order, and the filter runs afterwards on the grouped rows. On eight
    orders the cost is nothing; on a table of millions with an index on <code>user_id</code>, it is
    the difference between reading one user's rows and reading all of them.
  </p>
  <p>
    A CTE referenced twice can be computed once or twice. In Postgres's plan for the above-average
    query, the CTE appears once and is scanned at both references:
  </p>
  {@render plan(SQL_EXAMPLES.planTwice, 'A CTE referenced twice')}
  <p>With <code>NOT MATERIALIZED</code>, the query is substituted at both references:</p>
  {@render plan(SQL_EXAMPLES.planTwiceInlined, 'A CTE referenced twice, NOT MATERIALIZED')}
  <p>
    Now <code>orders</code> is scanned and grouped twice, once for the rows and once, as
    <code>orders_1</code>, for the average. Which is cheaper depends on the query: computing twice
    lets each copy use the conditions around it, computing once saves the repeated work. The plan is
    the place to check.
  </p>
  <p>
    SQLite accepts the same two keywords since version 3.35.0, and its release notes say that
    version also changed the default for a CTE used more than once to materialized. With
    <code>MATERIALIZED</code>, SQLite computes the CTE into an ephemeral table and gives up
    flattening and push-down; its documentation calls that loss a feature, an optimization fence to
    use on purpose.
    <code>NOT MATERIALIZED</code> substitutes the CTE as a subquery at every use, though the planner may
    still materialize it. The SQLite documentation recommends using neither keyword without a compelling
    reason. A hint changes how the query runs, never its rows:
  </p>
  <SqlQuery
    example={SQL_EXAMPLES.aboveAverageMaterialized}
    label="The above-average query, MATERIALIZED"
  />
  <p>
    MySQL has had CTEs since 8.0, recursive and not. Its manual documents no
    <code>MATERIALIZED</code> keyword; its optimizer merges a CTE into the outer query or
    materializes it, as it does a subquery in <code>FROM</code> or a view, computes a materialized
    CTE once per query however many references there are, and takes the <code>MERGE</code> and
    <code>NO_MERGE</code> optimizer hints per reference.
  </p>
  <p>
    Write a CTE for the reading order, check the plan when the query is slow, and add a hint only
    when the plan shows the wrong strategy.
  </p>
</DocsSection>
