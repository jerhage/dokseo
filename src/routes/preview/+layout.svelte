<script lang="ts">
  import { page } from '$app/state';
  import NavLink from '$lib/components/NavLink.svelte';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import { activeComparison, isShowing, variantHref } from './comparison';

  let { children } = $props();

  const comparison = activeComparison();
  const screen = comparison?.fills === 'screen';
  const links = $derived(
    (comparison?.variants ?? []).flatMap((variant) => {
      const href = variantHref(variant, page.params, page.url.search);
      return href === null ? [] : [{ variant, href }];
    }),
  );
</script>

<div class={['surface-bg col gap-0', screen ? 'h-screen' : 'min-h-screen']}>
  <div
    class={[
      'row wrap items-center gap-2 px-4 py-2 surface shrink-0',
      links.length === 0 ? 'justify-end' : 'justify-between',
    ]}
  >
    {#if links.length > 0}
      <nav class="row wrap items-center gap-1" aria-label="Design variants">
        {#each links as link (link.variant.route)}
          <NavLink href={link.href} current={isShowing(link.variant, page.url.pathname)}>
            {link.variant.label}
          </NavLink>
        {/each}
      </nav>
    {/if}
    <AppearanceSwitcher />
  </div>
  {#if screen}
    <div class="col gap-0 flex-1 min-h-0">{@render children()}</div>
  {:else}
    {@render children()}
  {/if}
</div>
