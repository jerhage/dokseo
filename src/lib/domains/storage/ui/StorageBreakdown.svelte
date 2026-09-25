<script lang="ts">
  import Progress from '$lib/components/Progress.svelte';
  import type { StorageAccount } from '../domain/storage-parts';
  import { measuredFigure, originFigure } from './storage-view.svelte';
  import { UNNAMED_KEY, breakdownRows, breakdownScale } from './storage-overview';

  type Props = { readonly account: StorageAccount };

  let { account }: Props = $props();

  const uid = $props.id();

  const rows = $derived(breakdownRows(account));
  const scale = $derived(breakdownScale(account));
  const origin = $derived(originFigure(account));
</script>

<section class="col gap-2" aria-labelledby="{uid}-heading">
  <h2 id="{uid}-heading" class="px-1 text-xs uppercase tracking-wide text-muted weight-semibold">
    What takes up space
  </h2>
  <div class="surface bordered rounded-container overflow-hidden">
    <ul class="list-reset">
      {#each rows as row, index (row.key)}
        <li class={['col gap-2 px-4 py-3', { 'border-t': index > 0 }]}>
          <div class="row items-start justify-between gap-3">
            <div class="col gap-1 flex-1">
              <span class="text-sm">{row.label}</span>
              <span class="text-xs text-muted">{row.detail}</span>
            </div>
            <span
              class={[
                'mono shrink-0',
                row.bytes === null ? 'text-xs text-faint' : 'text-sm weight-medium',
              ]}>{row.figure}</span
            >
          </div>
          {#if row.bytes !== null && scale > 0}
            <Progress
              label="{row.label}, share of the space used"
              value={row.bytes}
              max={scale}
              size="sm"
              variant={row.key === UNNAMED_KEY ? 'accent' : 'primary'}
            />
          {/if}
        </li>
      {/each}
    </ul>
    <dl class="col gap-0 surface-sunken border-t">
      <div class="row items-center justify-between gap-3 px-4 py-2">
        <dt class="text-sm weight-semibold">Measured above</dt>
        <dd class="mono text-sm weight-semibold shrink-0">{measuredFigure(account)}</dd>
      </div>
      {#if origin !== null}
        <div class="row items-center justify-between gap-3 px-4 py-2 border-t">
          <dt class="text-sm weight-semibold">Counted by the browser for this app</dt>
          <dd class="mono text-sm weight-semibold shrink-0">{origin}</dd>
        </div>
      {/if}
    </dl>
  </div>
</section>
