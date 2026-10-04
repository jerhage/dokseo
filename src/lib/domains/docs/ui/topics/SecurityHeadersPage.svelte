<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import ChaptersSection from './security-headers/ChaptersSection.svelte';
  import DeliverySection from './security-headers/DeliverySection.svelte';
  import DirectivesSection from './security-headers/DirectivesSection.svelte';
  import DownloadsSection from './security-headers/DownloadsSection.svelte';
  import EmbedderSection from './security-headers/EmbedderSection.svelte';
  import FramesSection from './security-headers/FramesSection.svelte';
  import IsolationSection from './security-headers/IsolationSection.svelte';
  import PolicySection from './security-headers/PolicySection.svelte';
  import { SECTIONS } from './security-headers/sections';
  import SourcesSection from './security-headers/SourcesSection.svelte';
  import WebkitSection from './security-headers/WebkitSection.svelte';
  import WorkersSection from './security-headers/WorkersSection.svelte';
</script>

<DocsPage slug="security-headers" sections={Object.values(SECTIONS)}>
  {#snippet lead()}
    Dokseo runs OCR models on WebAssembly threads and renders EPUB chapters from any source. Both
    rely on rules the server sends as response headers: which content may run, and who may share the
    page's memory.
  {/snippet}

  <PolicySection />
  <DeliverySection />
  <IsolationSection />
  <EmbedderSection />
  <WorkersSection />
  <FramesSection />
  <DirectivesSection />
  <SourcesSection />
  <DownloadsSection />
  <ChaptersSection />
  <WebkitSection />
</DocsPage>
