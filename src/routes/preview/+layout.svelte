<script lang="ts">
  import { page } from '$app/state';
  import NavLink from '$lib/components/NavLink.svelte';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import { COMPARISON, isShowing } from './comparison';

  let { children } = $props();
</script>

<div class="surface-bg min-h-screen">
  <div class="row wrap items-center justify-between gap-2 px-4 py-2 surface">
    <nav class="row wrap items-center gap-1" aria-label="Design variants">
      {#each COMPARISON.variants as variant (variant.href)}
        <NavLink href={variant.href} current={isShowing(variant, page.url.pathname)}>
          {variant.label}
        </NavLink>
      {/each}
    </nav>
    <AppearanceSwitcher />
  </div>
  {@render children()}
</div>
