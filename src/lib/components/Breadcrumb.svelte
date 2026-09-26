<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import ChevronRight from './icons/ChevronRight.svelte';

  type Crumb = { readonly label: string; readonly href?: string | undefined };

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
        {#if index === items.length - 1 || item.href === undefined}
          <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>
        {:else}
          <a href={item.href}>{item.label}</a>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
