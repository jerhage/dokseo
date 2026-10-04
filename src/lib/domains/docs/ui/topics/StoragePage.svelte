<script lang="ts">
  import type { Snippet } from 'svelte';
  import DocsPage from '../DocsPage.svelte';
  import StorageConcepts from './storage/StorageConcepts.svelte';
  import StorageDurability from './storage/StorageDurability.svelte';
  import StorageInDokseo from './storage/StorageInDokseo.svelte';
  import { STORAGE_SECTIONS } from './storage/storage-sections';

  type Props = { account: Snippet };

  let { account }: Props = $props();
</script>

<DocsPage slug="storage" sections={Object.values(STORAGE_SECTIONS)}>
  {#snippet lead()}
    How a web app keeps data on the device, when the browser deletes it, and how Dokseo keeps a
    library from disappearing.
  {/snippet}

  <StorageConcepts />
  <StorageInDokseo {account} />
  <StorageDurability />
</DocsPage>
