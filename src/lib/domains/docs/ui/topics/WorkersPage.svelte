<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import WorkersConcepts from './workers/WorkersConcepts.svelte';
  import WorkersCoordination from './workers/WorkersCoordination.svelte';
  import WorkersInDokseo from './workers/WorkersInDokseo.svelte';
  import { WORKERS_SECTIONS } from './workers/workers-sections';
</script>

<DocsPage slug="workers" sections={Object.values(WORKERS_SECTIONS)}>
  {#snippet lead()}
    Why long work freezes a page, how a worker runs it on another thread, and what happens to data
    on the way between the two: copied, moved or shared. Every demo starts a real worker in this
    browser.
  {/snippet}
  <WorkersConcepts />
  <WorkersCoordination />
  <WorkersInDokseo />
</DocsPage>
