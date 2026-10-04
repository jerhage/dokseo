<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import samplePage from './ocr/sample-page.png';
  import RenderingConcepts from './rendering-pages/RenderingConcepts.svelte';
  import RenderingInDokseo from './rendering-pages/RenderingInDokseo.svelte';
  import RenderingViewing from './rendering-pages/RenderingViewing.svelte';
  import { RENDERING_SECTIONS } from './rendering-pages/rendering-sections';
</script>

<DocsPage slug="rendering-pages" sections={Object.values(RENDERING_SECTIONS)}>
  {#snippet lead()}
    How Dokseo turns a CBZ, a folder of images or a PDF into pages on screen, one page at a time,
    without holding the book in memory.
  {/snippet}

  <RenderingConcepts pageUrl={samplePage} />
  <RenderingInDokseo />
  <RenderingViewing />
</DocsPage>
