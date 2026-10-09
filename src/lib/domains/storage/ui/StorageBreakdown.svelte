<script lang="ts">
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import Progress from '$lib/ui/components/Progress.svelte';
  import type { StorageAccount } from '../domain/storage-parts';
  import { measuredFigure, originFigure } from './storage-view';
  import { UNNAMED_KEY, breakdownRows, breakdownScale } from './storage-overview';

  type Props = { readonly account: StorageAccount };

  let { account }: Props = $props();

  const rows = $derived(breakdownRows(account));
  const scale = $derived(breakdownScale(account));
  const origin = $derived(originFigure(account));
</script>

<ListGroup title="What takes up space">
  {#each rows as row (row.key)}
    <ListRow
      title={row.label}
      description={row.detail}
      value={row.figure}
      valueTone={row.bytes === null ? 'faint' : 'default'}
    >
      {#if row.bytes !== null && scale > 0}
        <Progress
          label="{row.label}, share of the space used"
          value={row.bytes}
          max={scale}
          size="sm"
          variant={row.key === UNNAMED_KEY ? 'accent' : 'primary'}
        />
      {/if}
    </ListRow>
  {/each}
  {#snippet summary()}
    <ListRow listed size="sm" strong title="Measured above" value={measuredFigure(account)} />
    {#if origin !== null}
      <ListRow listed size="sm" strong title="Counted by the browser for this app" value={origin} />
    {/if}
  {/snippet}
</ListGroup>
