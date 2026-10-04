<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import AsyncConcepts from './async-correctness/AsyncConcepts.svelte';
  import AsyncFailures from './async-correctness/AsyncFailures.svelte';
  import { ASYNC_SECTIONS } from './async-correctness/async-sections';
  import AsyncStaleInDokseo from './async-correctness/AsyncStaleInDokseo.svelte';
  import AsyncWaitsInDokseo from './async-correctness/AsyncWaitsInDokseo.svelte';
</script>

<DocsPage slug="async-correctness" sections={Object.values(ASYNC_SECTIONS)}>
  {#snippet lead()}
    Asynchronous code that stays correct when answers arrive late, out of order or never: the event
    loop, stale answers and how to drop them, cancellation, timeouts, unhandled rejections and the
    double submit, with live demos on this browser's own timers and Dokseo's real export code.
  {/snippet}
  <AsyncConcepts />
  <AsyncFailures />
  <AsyncStaleInDokseo />
  <AsyncWaitsInDokseo />
</DocsPage>
