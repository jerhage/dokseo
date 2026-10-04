<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import { UnreadableRowsExport, unreadableRowsOffer } from './unreadable-rows-export.svelte';
  import type { UnreadableRows, UnreadableRowsExporting } from './unreadable-rows-export.svelte';

  type Props = {
    readonly rows: UnreadableRows;
    readonly exporting: UnreadableRowsExporting;
  };

  let { rows, exporting }: Props = $props();

  const view = new UnreadableRowsExport();
  const built = $derived(exporting.exportUnreadableRows(rows));
  const offer = $derived(unreadableRowsOffer(view.state, built));
</script>

{#if offer.kind === 'export'}
  <div class="col gap-2 items-start mt-2">
    <Button
      size="sm"
      variant="outline"
      loading={offer.busy}
      disabled={offer.busy}
      onclick={() => void view.save(built)}
    >
      Export these first
    </Button>
    {#if offer.confirmation !== null}
      <p class="m-0 text-sm text-muted" role="status">{offer.confirmation}</p>
    {/if}
  </div>
{:else if offer.kind === 'another-tap'}
  <div class="col gap-2 items-start mt-2">
    <p class="m-0 text-sm" role="status">{offer.prompt}</p>
    <Button size="sm" variant="primary" onclick={() => void view.save(built)}>Save file</Button>
  </div>
{/if}
