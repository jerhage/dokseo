<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import PatternsAggregates from './sql-patterns/PatternsAggregates.svelte';
  import PatternsCtes from './sql-patterns/PatternsCtes.svelte';
  import PatternsRecursive from './sql-patterns/PatternsRecursive.svelte';
  import PatternsRows from './sql-patterns/PatternsRows.svelte';
  import { SQL_PATTERNS_SECTIONS } from './sql-patterns/sql-patterns-sections';
</script>

<DocsPage slug="sql-patterns" sections={Object.values(SQL_PATTERNS_SECTIONS)}>
  {#snippet lead()}
    Recipes for the queries that come up again and again: loading a list without a query per item,
    counting and filtering groups, asking whether a row exists or has no match, ranking, running
    totals, removing duplicates, naming the steps of a query with common table expressions, and
    walking a tree. Each one runs on the same sample tables, with its real result.
  {/snippet}
  <PatternsAggregates />
  <PatternsRows />
  <PatternsCtes />
  <PatternsRecursive />
</DocsPage>
