<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import { REMOTE_SECTIONS } from './remote-storage-plan/remote-sections';
  import RemoteBrowser from './remote-storage-plan/RemoteBrowser.svelte';
  import RemoteContract from './remote-storage-plan/RemoteContract.svelte';
  import RemoteDownload from './remote-storage-plan/RemoteDownload.svelte';
  import RemoteSetup from './remote-storage-plan/RemoteSetup.svelte';
  import RemoteViews from './remote-storage-plan/RemoteViews.svelte';
</script>

<DocsPage slug="remote-storage-plan" sections={Object.values(REMOTE_SECTIONS)}>
  {#snippet lead()}
    Reading books from OPDS catalogs: what the format offers, what the browser requires of a static
    app that calls another server, the book, publication and origin records Dokseo keeps apart, how
    browsing, a download and a replacement work, and how to put a proxy in front of a home server.
  {/snippet}
  <RemoteBrowser />
  <RemoteContract />
  <RemoteViews />
  <RemoteDownload />
  <RemoteSetup />
</DocsPage>
