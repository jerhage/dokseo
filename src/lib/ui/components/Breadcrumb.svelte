<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import ChevronRight from './icons/ChevronRight.svelte';

  type Crumb = {
    readonly label: string;
    readonly href?: string | undefined;
    readonly onselect?: (() => void) | undefined;
  };

  type Props = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
    items: readonly Crumb[];
    label?: string;
  };

  let { items, label = 'Breadcrumb', class: className, ...rest }: Props = $props();
</script>

<nav {...rest} aria-label={label} class={className}>
  <ol class="breadcrumb">
    {#each items as item, index (index)}
      {#if index > 0}
        <li class="breadcrumb-separator" aria-hidden="true">
          <ChevronRight class="breadcrumb-icon" />
        </li>
      {/if}
      <li class="breadcrumb-item">
        {#if index === items.length - 1}
          <span aria-current="page">{item.label}</span>
        {:else if item.href !== undefined}
          <a href={item.href}>{item.label}</a>
        {:else if item.onselect !== undefined}
          <button type="button" onclick={item.onselect}>{item.label}</button>
        {:else}
          <span>{item.label}</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
