<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import Stat from '$lib/components/Stat.svelte';
  import type { StorageAccount } from '../../../domain/storage-parts';
  import { allowanceNote, persistenceNote } from '../../storage-view.svelte';
  import { allowanceOf, usedHeadline } from './storage-overview';

  type Props = { readonly account: StorageAccount };

  let { account }: Props = $props();

  const headline = $derived(usedHeadline(account));
  const allowance = $derived(allowanceOf(account));
  const allowed = $derived(allowanceNote(account));
</script>

<section class="surface bordered rounded-container col gap-4 p-5" aria-label="Space used">
  <div class="row wrap items-start justify-between gap-3">
    <Stat class="p-0" label="Used by this app" value={headline.figure} delta={headline.caption} />
    {#if account.persisted}
      <Badge variant="success" dot>Persistent</Badge>
    {:else}
      <Badge variant="warning" dot>May be cleared</Badge>
    {/if}
  </div>

  {#if allowance !== null}
    <div class="col gap-2">
      <Progress
        label="Share of what the browser allows this app"
        value={allowance.used}
        max={allowance.allowed}
        size="sm"
      />
      {#if allowed !== null}
        <p class="text-xs text-muted">{allowed}</p>
      {/if}
    </div>
  {/if}

  <p class="text-xs text-muted border-t pt-3">{persistenceNote(account)}</p>
</section>
