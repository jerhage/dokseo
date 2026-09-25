<script lang="ts">
  import { page } from '$app/state';
  import NavLink from '$lib/components/NavLink.svelte';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import { activeComparison, isShowing } from './comparison';

  let { children } = $props();

  const comparison = activeComparison();
</script>

<div class="surface-bg min-h-screen">
  <div
    class={[
      'row wrap items-center gap-2 px-4 py-2 surface',
      comparison === null ? 'justify-end' : 'justify-between',
    ]}
  >
    {#if comparison !== null}
      <nav class="row wrap items-center gap-1" aria-label="Design variants">
        {#each comparison.variants as variant (variant.href)}
          <NavLink href={variant.href} current={isShowing(variant, page.url.pathname)}>
            {variant.label}
          </NavLink>
        {/each}
      </nav>
    {/if}
    <AppearanceSwitcher />
  </div>
  {@render children()}
</div>
