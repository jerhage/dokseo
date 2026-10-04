<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import AnchorSections from './epub-rendering/AnchorSections.svelte';
  import ConceptSections from './epub-rendering/ConceptSections.svelte';
  import { EPUB_SECTIONS } from './epub-rendering/epub-sections';
  import type { CapturePassage, InkProbe, OpenFlow } from './epub-rendering/flow-kit';
  import ReaderSections from './epub-rendering/ReaderSections.svelte';
  import './epub-rendering/epub-rendering.css';

  type Props = {
    open: OpenFlow;
    passage: CapturePassage;
    ink: InkProbe;
  };

  let { open, passage, ink }: Props = $props();

  const kit = $derived({ open, passage, ink });
</script>

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
