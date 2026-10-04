<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import SetBasics from './sql-set-theory/SetBasics.svelte';
  import SetJoins from './sql-set-theory/SetJoins.svelte';
  import SetOperations from './sql-set-theory/SetOperations.svelte';
  import { SQL_SET_SECTIONS } from './sql-set-theory/sql-set-sections';
</script>

<DocsPage slug="sql-set-theory" sections={Object.values(SQL_SET_SECTIONS)}>
  {#snippet lead()}
    A table is a relation, a set of rows, and each part of a query is an operation on sets: WHERE
    selects, SELECT projects, a join filters a product, EXISTS and NOT EXISTS keep the rows with and
    without a match, and GROUP BY partitions. Every query below ran on small sample tables, with its
    real result beside it.
  {/snippet}
  <SetBasics />
  <SetJoins />
  <SetOperations />
</DocsPage>
