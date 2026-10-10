<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import { CH_SECTIONS } from './ch-unit/ch-sections';
  import ChUnitConcepts from './ch-unit/ChUnitConcepts.svelte';
</script>

<DocsPage slug="ch-unit" sections={Object.values(CH_SECTIONS)}>
  {#snippet lead()}
    What the CSS ch unit measures, why the same value is a different width in every font, and what
    that means for a line length, with live demos that measure this browser's rendering.
  {/snippet}
  <ChUnitConcepts />
</DocsPage>
