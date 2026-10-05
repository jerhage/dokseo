<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import DriftConcepts from './example-drift/DriftConcepts.svelte';
  import DriftFailures from './example-drift/DriftFailures.svelte';
  import DriftLimits from './example-drift/DriftLimits.svelte';
  import { DRIFT_SECTIONS } from './example-drift/drift-sections';
  import RecordedOutputs from './example-drift/RecordedOutputs.svelte';
</script>

<DocsPage slug="example-drift" sections={Object.values(DRIFT_SECTIONS)}>
  {#snippet lead()}
    How a code example on a docs page goes stale, and how Dokseo keeps its examples true: quotes
    kept as data with their source path, a unit test that finds each quote in its file, and CI that
    runs it on every pull request. Then the same idea for recorded output, from SQL results to
    compiler errors and bundles, and what no check covers.
  {/snippet}
  <DriftConcepts />
  <DriftFailures />
  <RecordedOutputs />
  <DriftLimits />
</DocsPage>
