<script lang="ts">
  import { useContainer } from '$lib/context';
  import StoragePage from '$lib/domains/docs/ui/topics/StoragePage.svelte';
  import StorageBreakdown from '$lib/domains/storage/ui/StorageBreakdown.svelte';
  import StorageData from '$lib/domains/storage/ui/StorageData.svelte';
  import StorageSummary from '$lib/domains/storage/ui/StorageSummary.svelte';

  const storage = useContainer().storage;
</script>

<StoragePage>
  {#snippet account()}
    <StorageData {storage}>
      {#snippet children(held)}
        <StorageSummary account={held} />
        <StorageBreakdown account={held} />
      {/snippet}
    </StorageData>
  {/snippet}
</StoragePage>
