<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import PolicySection from './security-headers/PolicySection.svelte';
  import { SECTIONS } from './security-headers/sections';
</script>

<DocsPage slug="security-headers" sections={Object.values(SECTIONS)}>
  {#snippet lead()}
    Dokseo runs OCR models on WebAssembly threads and renders EPUB chapters from any source. Both
    rely on rules the server sends as response headers: which content may run, and who may share the
    page's memory.
  {/snippet}

  <PolicySection />
</DocsPage>
