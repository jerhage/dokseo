<script lang="ts" generics="Item">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { hiddenNames, overflowLine } from './overflow-list';

  type Props = {
    items: readonly Item[];
    room: number;
    item: Snippet<[Item]>;
    name: (item: Item) => string;
    key?: (item: Item) => string | number;
    inline?: boolean;
    label?: string;
    moreLabel?: string;
    class?: ClassValue;
  };

  let {
    items,
    room,
    item,
    name,
    key,
    inline = false,
    label,
    moreLabel = 'more',
    class: className,
  }: Props = $props();

  const line = $derived(overflowLine(items, room));
  const more = $derived(hiddenNames(line.hidden, name));
</script>

{#snippet count()}
  +{line.hidden.length}<span class="visually-hidden"> {moreLabel}: {more}</span>
{/snippet}

{#if inline}
  {#each line.shown as entry, at (key?.(entry) ?? at)}
    {@render item(entry)}
  {/each}
  {#if line.hidden.length > 0}
    <span class="text-xs text-muted" title={more}>{@render count()}</span>
  {/if}
{:else if items.length > 0}
  <ul class={['overflow-list', className]} aria-label={label}>
    {#each line.shown as entry, at (key?.(entry) ?? at)}
      <li class="row min-w-0">{@render item(entry)}</li>
    {/each}
    {#if line.hidden.length > 0}
      <li class="shrink-0 text-xs text-muted" title={more}>{@render count()}</li>
    {/if}
  </ul>
{/if}
