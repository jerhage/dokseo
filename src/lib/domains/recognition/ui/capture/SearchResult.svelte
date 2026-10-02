<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import CommandItem from '$lib/components/CommandItem.svelte';
  import Highlight from '$lib/components/Highlight.svelte';
  import Thumbnail from '$lib/components/Thumbnail.svelte';
  import type { SearchRow } from './search-rows';

  type Props = {
    readonly row: SearchRow;
    readonly current: boolean;
    readonly onopen: (row: SearchRow) => void;
    ref?: HTMLElement | null | undefined;
  };

  let { row, current, onopen, ref = $bindable() }: Props = $props();

  function click(event: MouseEvent): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    onopen(row);
  }
</script>

{#snippet content()}
  <Thumbnail src={row.cover} size="sm" bordered />
  <span class="col gap-1 flex-1">
    <span class="truncate text-base" lang={row.language}>
      <Highlight segments={row.segments} />
    </span>
    {#if row.kind === 'book'}
      {#if row.images !== null}
        <span class="text-xs text-muted">{row.images} images</span>
      {/if}
    {:else}
      {#if row.note !== null}
        <span class="accent-start truncate text-xs text-muted"
          ><Highlight segments={row.note} /></span
        >
      {/if}
      {#if row.title !== null}
        <span class="truncate text-xs text-muted">{row.title}</span>
      {/if}
      {#if row.chips.length > 0}
        <span class="row wrap gap-1">
          {#each row.chips as chip (chip.id)}
            <Badge color={chip.colour} emphasis={chip.matched ? 'solid' : 'tinted'}
              >{chip.name}</Badge
            >
          {/each}
        </span>
      {/if}
    {/if}
  </span>
{/snippet}

{#if row.href !== null}
  <CommandItem
    bind:ref
    href={row.href}
    selected={current}
    hint={row.kind === 'capture' ? row.place : undefined}
    hintLang={row.kind === 'capture' ? (row.placeLanguage ?? undefined) : undefined}
    onclick={click}
  >
    {@render content()}
  </CommandItem>
{:else}
  <CommandItem
    bind:ref
    element="div"
    selected={current}
    hint={row.kind === 'capture' ? row.place : undefined}
    hintLang={row.kind === 'capture' ? (row.placeLanguage ?? undefined) : undefined}
  >
    {@render content()}
  </CommandItem>
{/if}
