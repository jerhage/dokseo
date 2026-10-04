<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import OfflineConcepts from './offline/OfflineConcepts.svelte';
  import OfflineLessons from './offline/OfflineLessons.svelte';
  import OfflineShell from './offline/OfflineShell.svelte';
  import OfflineUpdates from './offline/OfflineUpdates.svelte';
  import { OFFLINE_SECTIONS } from './offline/sections';
</script>

<DocsPage slug="offline" sections={Object.values(OFFLINE_SECTIONS)}>
  {#snippet lead()}
    Dokseo keeps books, captures and OCR models on the device. A service worker keeps the app itself
    there too, so it opens and reads with no network, and installs as an app that updates when the
    reader chooses.
  {/snippet}

  <OfflineConcepts />
  <OfflineShell />
  <OfflineUpdates />
  <OfflineLessons />
</DocsPage>
