<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import CommandItem from '$lib/components/CommandItem.svelte';
  import MarkedText from './MarkedText.svelte';
  import type { PaletteRow } from './palette-rows';

  type Props = {
    readonly row: PaletteRow;
    readonly current: boolean;
    readonly onopen: (row: PaletteRow) => void;
    ref?: HTMLElement | undefined;
  };

  let { row, current, onopen, ref = $bindable() }: Props = $props();

  function click(event: MouseEvent): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    onopen(row);
  }
</script>

<CommandItem
  bind:ref
  href={row.href}
  selected={current}
  hint={row.kind === 'capture' ? row.place : undefined}
  onclick={click}
>
  <span
    class="w-6 shrink-0 aspect-portrait rounded-control overflow-hidden bordered surface-sunken"
  >
    {#if row.cover !== null}
      <img class="object-cover" src={row.cover} alt="" />
    {/if}
  </span>
  <span class="col gap-1 flex-1">
    <span class="truncate text-base" lang={row.language}>
      <MarkedText segments={row.segments} />
    </span>
    {#if row.kind === 'book'}
      {#if row.images !== null}
        <span class="text-xs text-muted">{row.images} images</span>
      {/if}
    {:else}
      {#if row.note !== null}
        <span class="accent-start truncate text-xs text-muted"
          ><MarkedText segments={row.note} /></span
        >
      {/if}
      {#if row.title !== null}
        <span class="truncate text-xs text-muted">{row.title}</span>
      {/if}
      {#if row.chips.length > 0}
        <span class="row wrap gap-1">
          {#each row.chips as chip (chip.id)}
            <Badge colour={chip.colour} solid={chip.matched}>{chip.name}</Badge>
          {/each}
        </span>
      {/if}
    {/if}
  </span>
</CommandItem>
