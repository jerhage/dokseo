<script lang="ts">
  import { page } from '$app/state';
  import NavLink from '$lib/components/NavLink.svelte';

  let { children } = $props();

  const VARIANTS = [
    { href: '/', label: 'Current' },
    { href: '/preview/a', label: 'A' },
    { href: '/preview/b', label: 'B' },
  ] as const;
</script>

<div class="surface-bg min-h-screen">
  <nav class="row items-center gap-1 px-4 py-2 surface" aria-label="Design variants">
    {#each VARIANTS as variant (variant.href)}
      <NavLink href={variant.href} current={page.url.pathname === variant.href}>
        {variant.label}
      </NavLink>
    {/each}
  </nav>
  {@render children()}
</div>
