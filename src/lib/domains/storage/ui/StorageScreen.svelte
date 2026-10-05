<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import type { StorageReads } from '../queries/storage-queries';
  import StorageBreakdown from './StorageBreakdown.svelte';
  import StorageData from './StorageData.svelte';
  import StorageSummary from './StorageSummary.svelte';

  type Props = { readonly storage: StorageReads; readonly engineHref?: string };

  let { storage, engineHref = '/settings/engine' }: Props = $props();
</script>

<div class="col gap-6 prose">
  <header class="col gap-1">
    <h1 class="text-lg">Storage</h1>
    <p class="text-sm text-muted">
      Everything this app keeps on this device, largest first. The parts are added up, then compared
      with the total the browser reports, so whatever they do not explain is named rather than
      hidden.
    </p>
  </header>

  <StorageData {storage}>
    {#snippet children(account)}
      <StorageSummary {account} />
      <StorageBreakdown {account} />
    {/snippet}
  </StorageData>

  <ListGroup title="Free up space">
    <ListRow title="Books" description="Books are removed from your library.">
      {#snippet actions()}
        <Button href="/" size="sm" variant="outline">Open your library</Button>
      {/snippet}
    </ListRow>
    <ListRow title="Recognition model" description="The model is removed on the OCR engine page.">
      {#snippet actions()}
        <Button href={engineHref} size="sm" variant="outline">OCR engine</Button>
      {/snippet}
    </ListRow>
  </ListGroup>
</div>
