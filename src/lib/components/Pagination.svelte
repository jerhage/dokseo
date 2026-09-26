<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import ChevronLeft from './icons/ChevronLeft.svelte';
  import ChevronRight from './icons/ChevronRight.svelte';
  import { paginationWindow } from './pagination-window';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
    total: number;
    page?: number;
    siblings?: number;
    href?: (page: number) => string;
    onpagechange?: (page: number) => void;
    label?: string;
    previousLabel?: string;
    nextLabel?: string;
  };

  let {
    total,
    page = $bindable(1),
    siblings = 1,
    href,
    onpagechange,
    label = 'Pagination',
    previousLabel = 'Previous',
    nextLabel = 'Next',
    class: className,
    ...rest
  }: Props = $props();

  const slots = $derived(paginationWindow(page, total, siblings));

  function go(target: number): void {
    if (target < 1 || target > total || target === page) return;
    page = target;
    onpagechange?.(target);
  }
</script>

{#snippet content(text: string, part: string | undefined)}
  {#if part === 'pagination-prev'}
    <ChevronLeft class="pagination-icon" />
  {/if}
  {text}
  {#if part === 'pagination-next'}
    <ChevronRight class="pagination-icon" />
  {/if}
{/snippet}

{#snippet item(target: number, text: string, part: string | undefined, available: boolean)}
  {@const current = part === undefined && target === page}
  {#if href === undefined}
    <button
      type="button"
      class={['pagination-item', part, { 'is-active': current }]}
      aria-current={current ? 'page' : undefined}
      aria-disabled={available ? undefined : 'true'}
      disabled={!available}
      onclick={() => go(target)}>{@render content(text, part)}</button
    >
  {:else}
    <a
      class={['pagination-item', part, { 'is-active': current }]}
      href={available ? href(target) : undefined}
      aria-current={current ? 'page' : undefined}
      aria-disabled={available ? undefined : 'true'}
      onclick={() => go(target)}>{@render content(text, part)}</a
    >
  {/if}
{/snippet}

<nav {...rest} aria-label={label} class={['pagination', className]}>
  {@render item(page - 1, previousLabel, 'pagination-prev', page > 1)}
  {#each slots as slot (slot.kind === 'page' ? `page-${slot.page}` : `gap-${slot.after}`)}
    {#if slot.kind === 'page'}
      {@render item(slot.page, String(slot.page), undefined, true)}
    {:else}
      <span class="pagination-ellipsis" aria-hidden="true">…</span>
    {/if}
  {/each}
  {@render item(page + 1, nextLabel, 'pagination-next', page < total)}
</nav>
