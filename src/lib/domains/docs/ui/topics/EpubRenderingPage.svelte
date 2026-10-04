<script lang="ts">
  import { selectedPassage } from '$lib/domains/flowing/ui/flow-passage';
  import { openFlowSurface } from '$lib/domains/flowing/ui/flow-surface';
  import PageInkProbe from '$lib/domains/flowing/ui/PageInkProbe.svelte';
  import DocsPage from '../DocsPage.svelte';
  import AnchorSections from './epub-rendering/AnchorSections.svelte';
  import ConceptSections from './epub-rendering/ConceptSections.svelte';
  import { EPUB_SECTIONS } from './epub-rendering/epub-sections';
  import type { DemoInk, FlowKit } from './epub-rendering/flow-kit';
  import ReaderSections from './epub-rendering/ReaderSections.svelte';
  import './epub-rendering/epub-rendering.css';

  const kit: FlowKit = { open: openFlowSurface, passage: selectedPassage, ink };
</script>

{#snippet ink(onink: (ink: DemoInk) => void)}
  <PageInkProbe {onink} />
{/snippet}

<DocsPage slug="epub-rendering" sections={Object.values(EPUB_SECTIONS)}>
  {#snippet lead()}
    How a ZIP of XHTML chapters becomes pages you can turn, first in general and then in Dokseo's
    flow reader, with live demos that run the reader's own code on a sample book.
  {/snippet}
  <div class="epub-rendering stack-lg">
    <ConceptSections />
    <ReaderSections {kit} />
    <AnchorSections {kit} />
  </div>
</DocsPage>
