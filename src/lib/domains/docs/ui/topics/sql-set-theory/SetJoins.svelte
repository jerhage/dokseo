<script lang="ts">
  import Figure from '$lib/ui/components/Figure.svelte';
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import PairsDiagram from './PairsDiagram.svelte';
  import ProductGrid from './ProductGrid.svelte';
  import SqlQuery from './SqlQuery.svelte';
  import { SQL_EXAMPLES } from '../../../domain/sql-examples';
  import { sqlPatternsPageHref } from '../sql-patterns/sql-patterns-sections';
  import { SQL_SET_SECTIONS, sqlSetHref } from './sql-set-sections';
</script>

<DocsSection title={SQL_SET_SECTIONS.product}>
  <p>
    The <em>Cartesian product</em> of two sets pairs every element of the first with every element of
    the second. For relations, each pair becomes one row with the columns of both. Four users and six
    posts give 4 × 6 = 24 rows, most of them meaningless: Bob next to Alice's draft, Dana next to everything.
  </p>
  <SqlQuery example={SQL_EXAMPLES.productSize} label="The size of users × posts" />
  <Figure>
    <ProductGrid
      label="A grid of 4 users by 6 posts, 24 cells. The 5 cells where the post's user_id equals that user's id are filled: Alice with 101, 102 and 103, Bob with 104, Chen with 105. Dana's row and post 106's column have no filled cell."
    />
    {#snippet caption()}
      users × posts: one cell per pair. The filled cells are the pairs where
      <code>posts.user_id = users.id</code>.
    {/snippet}
  </Figure>
  <p>
    The product is rarely what anyone wants, and it grows as the product of the two sizes: two
    tables of 10,000 rows give 100 million pairs. Its use is as the starting point for a join.
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.joins}>
  <p>
    Selecting from the product the pairs that belong together gives a <em>join</em>. In the grid
    above that is the filled cells: a post next to its own author. Relational algebra writes the
    join with ⋈ (a bowtie), and defines it as exactly this, a selection over a product:
  </p>
  <DocsCode
    code={'users ⋈ users.id = posts.user_id posts\n  = σ users.id = posts.user_id (users × posts)'}
    label="A join as a selection over a product"
  />
  <p>Both spellings in SQL return the same five rows:</p>
  <SqlQuery example={SQL_EXAMPLES.filteredProduct} label="A join written as a filtered product" />
  <SqlQuery example={SQL_EXAMPLES.innerJoin} label="The same join with JOIN … ON" />
  <Figure>
    <PairsDiagram
      kind="inner"
      label="Users on the left, posts on the right, a line for each matching pair. Alice connects to 101, 102 and 103, Bob to 104, Chen to 105. Dana and post 106 have no line and are dimmed."
    />
    {#snippet caption()}
      An inner join returns one row per line. Rows with no line, Dana and the guest post, are not in
      the result.
    {/snippet}
  </Figure>
  <p>
    "Filtered product" describes what a join means, not how a database runs it. A database does not
    have to build the pairs to throw most of them away: it can find the matches through an index, a
    hash table or sorted inputs. Postgres 14's <code>EXPLAIN</code> showed the same plan for both
    queries above, a <code>Hash Join</code> that loads the users into a hash table and looks up each
    post's <code>user_id</code> in it.
  </p>
  <p>
    The result is a set of pairs, not of users. Alice has three posts, so she appears three times.
    That is the point of a join when the query needs the columns of both sides, and a source of
    wrong counts when it does not: <a href={sqlPatternsPageHref('fanOut')}
      >Count from two child tables</a
    > shows the numbers it can multiply.
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.outer}>
  <p>
    An inner join drops every row that has no partner. A <em>left join</em> keeps every row of the
    left table, and where it has no partner the right side's columns are <code>NULL</code>. Dana
    comes back with no post:
  </p>
  <SqlQuery example={SQL_EXAMPLES.leftJoin} label="A left join" />
  <Figure>
    <PairsDiagram
      kind="left"
      label="The same pairs as the inner join, but every user is kept, Dana included. Post 106 is still dimmed."
    />
    {#snippet caption()}
      A left join keeps every user. Dana's row is filled with <code>NULL</code> for the post's columns.
    {/snippet}
  </Figure>
  <p>
    A <em>full join</em> keeps the unmatched rows of both sides: Dana with no post, and the guest post
    with no user.
  </p>
  <SqlQuery example={SQL_EXAMPLES.fullJoin} label="A full join" />
  <p>
    SQLite has supported <code>RIGHT</code> and <code>FULL OUTER JOIN</code> since 3.39.0. MySQL has
    <code>LEFT</code> and <code>RIGHT</code> joins and no <code>FULL</code> join. Postgres sorts
    this result with the guest post last, because its <code>u.id</code> is <code>NULL</code> and
    Postgres sorts <code>NULL</code> last (<a href={sqlSetHref('order')}>Rows have no order</a>).
  </p>
  <p>
    Outer joins are an extension; the classical relational algebra does not include them. They have
    one subtlety: the <code>NULL</code> rows are added after the <code>ON</code> condition and
    before <code>WHERE</code>. Ask for every user with their published posts, and put the status
    test in <code>WHERE</code>:
  </p>
  <SqlQuery example={SQL_EXAMPLES.leftJoinWhere} label="A left join filtered in WHERE" />
  <p>
    Chen's only post is a draft, so his joined row fails the test; Dana's row has
    <code>NULL</code> for the status, so its test is unknown and, as
    <a href={sqlSetHref('nulls')}>NULL and three-valued logic</a> showed, dropped as well. The left
    join has become an inner join. Moved into <code>ON</code>, the test decides which posts match,
    and every user stays:
  </p>
  <SqlQuery example={SQL_EXAMPLES.leftJoinOn} label="A left join filtered in ON" />
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.semi}>
  <p>
    Often the question is not "which pairs match" but "which users have a match". The join answers
    it with repeats, one row per published post:
  </p>
  <SqlQuery example={SQL_EXAMPLES.joinRepeats} label="Users with a published post, by join" />
  <p>The set the question describes is</p>
  <DocsCode
    code={"{ u ∈ users | ∃ p ∈ posts : p.user_id = u.id ∧ p.status = 'published' }"}
    label="Users with a published post, in set notation"
  />
  <p>
    ∃ reads "there exists". This is a <em>semi-join</em>, written ⋉: it keeps each row of the left
    relation that has at least one partner on the right, once, with only the left side's columns.
    SQL writes the ∃ almost word for word as <code>EXISTS</code>:
  </p>
  <SqlQuery example={SQL_EXAMPLES.semiJoinExists} label="A semi-join with EXISTS" />
  <Figure>
    <PairsDiagram
      kind="semi"
      label="Users on the left, posts on the right. Lines go only to the published posts 101, 103 and 104. Alice and Bob are kept; Chen and Dana are dimmed. The posts are consulted but are not part of the result."
    />
    {#snippet caption()}
      A semi-join consults the right side (the published posts, outlined in the accent color) and
      returns only the left rows that have a line.
    {/snippet}
  </Figure>
  <p>
    The subquery refers to <code>u.id</code> from the outer query, which makes it a
    <em>correlated</em> subquery: it reads as "for this user, does a matching post exist". That is
    still one statement sent to the database once, not a query per user. On these tables, Postgres
    14's
    <code>EXPLAIN</code> showed a single <code>Hash Semi Join</code> for it.
  </p>
  <p>
    <code>IN</code> with a subquery asks the same thing, and Postgres 14 planned it the same way:
  </p>
  <SqlQuery example={SQL_EXAMPLES.semiJoinIn} label="A semi-join with IN" />
  <p>
    Why <code>SELECT 1</code>? <code>EXISTS</code> depends only on whether the subquery returns a
    row, not on what the row contains, so the select list is never read. The Postgres documentation
    calls
    <code>EXISTS(SELECT 1 WHERE ...)</code> a common coding convention. <code>SELECT *</code> or
    <code>SELECT NULL</code> give the same answer; <code>1</code> says to the reader that the columns
    do not matter. It does not mean "the first row".
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.anti}>
  <p>The opposite question, users with no posts at all, is the set</p>
  <DocsCode
    code={'{ u ∈ users | ∄ p ∈ posts : p.user_id = u.id }'}
    label="Users with no post, in set notation"
  />
  <p>
    ∄ reads "there is no". This is an <em>anti-join</em>, written ▷: keep each left row that has no
    partner on the right. SQL writes it as <code>NOT EXISTS</code>:
  </p>
  <SqlQuery example={SQL_EXAMPLES.antiJoinNotExists} label="An anti-join with NOT EXISTS" />
  <Figure>
    <PairsDiagram
      kind="anti"
      label="Users on the left, posts on the right, lines for every matching pair. Alice, Bob and Chen have lines and are dimmed. Dana has none and is kept."
    />
    {#snippet caption()}
      An anti-join keeps the left rows with no line. Only Dana has none.
    {/snippet}
  </Figure>
  <p>
    A left join followed by a test for the missing side gives the same set, using the
    <code>NULL</code>s the outer join adds:
  </p>
  <SqlQuery example={SQL_EXAMPLES.antiJoinLeftJoin} label="An anti-join with LEFT JOIN … IS NULL" />
  <p>
    The tested column must be one that cannot be <code>NULL</code> in a real match, such as the
    right table's primary key. Postgres 14 planned <code>NOT EXISTS</code> on these tables as a
    <code>Hash Anti Join</code>.
  </p>
</DocsSection>

<DocsSection title={SQL_SET_SECTIONS.notIn}>
  <p>
    <code>NOT IN</code> looks like the obvious third way to write the anti-join. On these tables it returns
    nothing at all:
  </p>
  <SqlQuery example={SQL_EXAMPLES.antiJoinNotIn} label="An anti-join with NOT IN, broken" />
  <p>
    The subquery lists every post's <code>user_id</code>: 1, 1, 1, 2, 3 and, for the guest post,
    <code>NULL</code>. Follow Dana through the condition:
  </p>
  <StepList>
    <StepItem title="Expand the NOT IN">
      <p>
        <code>4 NOT IN (1, 1, 1, 2, 3, NULL)</code> means 4 differs from every value:
        <code>4 &lt;&gt; 1 AND … AND 4 &lt;&gt; 3 AND 4 &lt;&gt; NULL</code>.
      </p>
    </StepItem>
    <StepItem title="Compare with each value">
      <p>
        Every comparison with a real id is true. The last one, <code>4 &lt;&gt; NULL</code>, is
        unknown.
      </p>
    </StepItem>
    <StepItem title="Combine them">
      <p>True AND unknown is unknown, so the whole condition is unknown.</p>
    </StepItem>
    <StepItem title="Filter">
      <p>
        <code>WHERE</code> keeps only true, so Dana is dropped. Alice, Bob and Chen each equal a value
        in the list, so their conditions are false. No row is left.
      </p>
    </StepItem>
  </StepList>
  <p>
    The Postgres documentation states the rule: when no right-hand value is equal and at least one
    is <code>NULL</code>, the result of <code>NOT IN</code> is null, not true. SQLite returns the same
    empty result. A single author-less post anywhere in the table empties the answer, and the query worked
    fine until that row arrived.
  </p>
  <p>
    <code>NOT EXISTS</code> does not have this failure: for the guest post its condition
    <code>p.user_id = u.id</code> is unknown, so that post is simply not a match, and the other
    posts decide. Filtering the <code>NULL</code>s out of the subquery also fixes
    <code>NOT IN</code>:
  </p>
  <SqlQuery example={SQL_EXAMPLES.antiJoinNotInFixed} label="NOT IN with the NULLs filtered out" />
  <p>
    On these tables, Postgres 14 also planned <code>NOT IN</code> differently: as a filter over a
    hashed subquery rather than as an anti-join, since the two do not mean the same thing once a
    <code>NULL</code> is possible. The rule: write anti-joins as <code>NOT EXISTS</code>, and use
    <code>NOT IN</code> only with a list that cannot contain <code>NULL</code>.
  </p>
</DocsSection>
