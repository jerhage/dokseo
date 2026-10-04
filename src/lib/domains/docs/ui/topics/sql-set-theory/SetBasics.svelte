<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import SqlQuery from './SqlQuery.svelte';
  import SqlResult from './SqlResult.svelte';
  import { PROJECTION_DIAGRAM, SELECTION_DIAGRAM } from '../../../domain/sql-diagrams';
  import { SQL_EXAMPLES, SQL_SCHEMA, SQL_TABLES } from '../../../domain/sql-examples';
  import {
    SQL_PATTERNS_PAGE_HREF,
    sqlPatternsPageHref,
  } from '../sql-patterns/sql-patterns-sections';
  import { SQL_SET_SECTIONS, sqlSetHref } from './sql-set-sections';
</script>

<DocsSection title={SQL_SET_SECTIONS.relations}>
  <p>
    In 1970 E. F. Codd described a way to store data that rests on set theory, the relational model.
    Its unit is the <em>relation</em>: a set of <em>tuples</em>, where each tuple holds one value
    for each named <em>attribute</em>. SQL calls the same things a table, its rows and its columns.
    A query takes relations in and gives a new relation back, so the result of one query can be the
    input of the next, the way <code>2 + 3</code> can sit inside <code>(2 + 3) × 4</code>.
  </p>
  <p>
    The examples here, and on <a href={SQL_PATTERNS_PAGE_HREF}>SQL patterns</a>, use three small
    tables: people, the posts they write, and the orders they place.
  </p>
  <DocsCode code={SQL_SCHEMA} label="The sample schema" />
  <SqlResult columns={SQL_TABLES.users.columns} rows={SQL_TABLES.users.rows} caption="users" />
  <SqlResult columns={SQL_TABLES.posts.columns} rows={SQL_TABLES.posts.rows} caption="posts" />
  <SqlResult columns={SQL_TABLES.orders.columns} rows={SQL_TABLES.orders.rows} caption="orders" />
  <p>
    A few rows are there on purpose. Dana has no posts and no orders. Post 106 has no author: its
    <code>user_id</code> is <code>NULL</code>, the way a post looks after its author's account is
    deleted under a foreign key declared <code>ON DELETE SET NULL</code>. Chen has two orders with
    the same total.
  </p>
  <p>
    I ran every query on these pages on SQLite 3.53 and on PostgreSQL 14 against exactly these rows.
    Each result table is SQLite's output. Where Postgres printed something different, the text says
    so.
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.bags}>
  <p>
    A set holds each element once: {'{'}1, 1, 2{'}'} is the same set as {'{'}1, 2{'}'}. A SQL table
    does not follow that rule. A table with no primary key or unique constraint can store the same
    row twice, and a query result often holds repeats: list the authors of the published posts and
    Alice appears once per post.
  </p>
  <p>
    So SQL works on <em>bags</em>, also called multisets: collections where an element can occur
    more than once and the count matters. Most of the set intuition still holds, but not all of it.
    For sets, removing T from the union of R and S gives the same result as removing T from each and
    then taking the union. For bags it can fail. Let R, S and T each hold the single row 1. Bag
    union adds counts, so R and S together hold 1 twice, and removing T's one copy leaves one row.
    Removing T from R leaves nothing, removing it from S leaves nothing, and the union of two empty
    bags is empty. Postgres, which has the bag versions as <code>UNION ALL</code> and
    <code>EXCEPT ALL</code>, returns one row for the first and none for the second.
  </p>
  <p>
    SQL gives you the set back on request. <code>DISTINCT</code> removes repeated rows from a result
    (<a href={sqlSetHref('projection')}>projection</a>), and <code>UNION</code>,
    <code>INTERSECT</code> and <code>EXCEPT</code> remove them by default (<a
      href={sqlSetHref('setOps')}>set operations</a
    >).
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.nulls}>
  <p>
    <code>NULL</code> stands for a missing value. Comparing anything with a missing value gives no
    answer, so the comparison is neither true nor false: its result is unknown, which SQL also
    writes as
    <code>NULL</code>. SQL logic therefore has three values, true, false and unknown. Even
    <code>NULL = NULL</code> is unknown; the test for a missing value is <code>IS NULL</code>.
  </p>
  <SqlQuery example={SQL_EXAMPLES.nullComparisons} label="Comparisons with NULL" />
  <p>
    SQLite has no separate boolean type and prints true as <code>1</code>. Postgres returns the same
    row as <code>null</code>, <code>null</code> and <code>true</code>.
  </p>
  <p>
    <code>WHERE</code> keeps a row only when its condition is true. A row whose condition is unknown is
    dropped exactly like a false one. Follow one row through a condition:
  </p>
  <StepList>
    <StepItem title="Ask for the posts Alice did not write">
      <p>Alice's id is 1, so the condition is <code>user_id &lt;&gt; 1</code>.</p>
    </StepItem>
    <StepItem title="Reach the guest post">
      <p>
        Post 106 has <code>user_id</code> <code>NULL</code>, so its condition is
        <code>NULL &lt;&gt; 1</code>, which is unknown.
      </p>
    </StepItem>
    <StepItem title="Lose it">
      <p>
        Unknown is not true, so <code>WHERE</code> drops the guest post, although Alice did not write
        it.
      </p>
    </StepItem>
  </StepList>
  <SqlQuery example={SQL_EXAMPLES.notOne} label="Posts not written by Alice, missing one" />
  <p>
    <code>IS DISTINCT FROM</code> compares the way most people expect: two missing values are not
    distinct, and a missing value is distinct from 1. Postgres has it, and SQLite has had it since
    3.39.0. Writing <code>user_id &lt;&gt; 1 OR user_id IS NULL</code> works everywhere.
  </p>
  <SqlQuery example={SQL_EXAMPLES.notOneOrNull} label="Posts not written by Alice" />
  <p>
    The rule: wherever a column can be <code>NULL</code>, decide what a missing value should do in
    each condition, and write that case out.
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.order}>
  <p>
    A set has no first element, and a table has no first row. Without <code>ORDER BY</code>,
    SQLite's documentation calls the order of the rows undefined, and Postgres's says they come back
    in whatever order the system finds fastest to produce. That order can change when the data grows
    or an index is added, so code that relies on it works until it does not. Every query on these
    pages ends with <code>ORDER BY</code>, which is also why the results can be shown at all.
  </p>
  <p>
    Sorting meets <code>NULL</code> too, and here databases disagree. SQLite treats
    <code>NULL</code> as smaller than every other value, so it comes first in ascending order.
    Postgres treats it as larger, so it comes last. <code>NULLS FIRST</code> and
    <code>NULLS LAST</code> set it explicitly in both.
  </p>
  <SqlQuery example={SQL_EXAMPLES.nullsSorted} label="Sorting a column with a NULL" />
  <p>Postgres returns the same rows with post 106 at the bottom.</p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.selection}>
  <p>
    <em>Selection</em> keeps the rows that satisfy a condition and drops the rest. In set-builder notation,
    the published posts are
  </p>
  <DocsCode
    code={"{ p ∈ posts | p.status = 'published' }\n\nσ status = 'published' (posts)"}
    label="Selection in set notation and in relational algebra"
  />
  <p>
    The first line reads "the set of posts p for which p's status is published". The second is the
    same thing in relational algebra, where σ (sigma) is selection. In SQL it is <code>WHERE</code>:
  </p>
  <Figure>
    <Diagram {...SELECTION_DIAGRAM} />
    {#snippet caption()}
      Selection drops rows and keeps every column. The result is a subset of the input.
    {/snippet}
  </Figure>
  <SqlQuery example={SQL_EXAMPLES.selection} label="Selection with WHERE" />
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.projection}>
  <p>
    <em>Projection</em> keeps some columns and drops the others. Relational algebra writes it π
    (pi), and SQL writes it as the list after <code>SELECT</code>. Selection picks rows, projection
    picks columns, and most queries do both: the authors of the published posts are
  </p>
  <DocsCode
    code={"π user_id ( σ status = 'published' (posts) )"}
    label="Projection after selection"
  />
  <Figure>
    <Diagram {...PROJECTION_DIAGRAM} />
    {#snippet caption()}
      Projecting three rows onto one column gives three values, with a repeat. DISTINCT turns the
      bag into a set.
    {/snippet}
  </Figure>
  <SqlQuery example={SQL_EXAMPLES.projection} label="Projection with SELECT" />
  <p>
    In relational algebra a projection is a set, so the repeated 1 would vanish. SQL keeps it,
    because removing duplicates costs a sort or a hash and a query often does not need it. Ask for
    it with <code>DISTINCT</code>, which applies to the whole output row:
  </p>
  <SqlQuery example={SQL_EXAMPLES.distinct} label="Projection with DISTINCT" />
  <p>
    A <code>SELECT</code> list can also compute new values, such as a sum or a label, which goes
    past the algebra's projection.
    <a href={sqlPatternsPageHref('projection')}>Return exactly what the screen shows</a> uses that to
    build a result for one screen.
  </p>
</DocsSection>
