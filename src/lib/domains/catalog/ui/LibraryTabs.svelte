<script lang="ts">
  import type { Snippet } from 'svelte';
  import Tabs from '$lib/ui/components/Tabs.svelte';
  import type { Catalog } from '../domain/catalog';
  import { useCatalogDeps } from './catalog-context';
  import CatalogBrowse from './CatalogBrowse.svelte';
  import CatalogHeldData from './CatalogHeldData.svelte';
  import { DEVICE_TAB, TABS_LABEL, catalogTabs, effectiveTab } from './library-tabs';

  type Props = {
    readonly catalogs: readonly Catalog[];
    readonly device: Snippet;
  };

  let { catalogs, device }: Props = $props();

  const deps = useCatalogDeps();

  const tabs = $derived(catalogTabs(catalogs));
  const selected = $derived(effectiveTab(deps.navigation.tab, catalogs));
</script>

<Tabs
  {tabs}
  label={TABS_LABEL}
  keepMounted
  bind:selected={() => selected, (id) => deps.navigation.select(id)}
>
  {#snippet panel(tab)}
    {@const catalog = catalogs.find((candidate) => candidate.id === tab.id)}
    <div class="col gap-6 pt-6">
      {#if tab.id === DEVICE_TAB}
        {@render device()}
      {:else if catalog !== undefined && (tab.id === selected || deps.navigation.hasTab(tab.id))}
        <CatalogHeldData {catalog} cases={deps.cases}>
          {#snippet children(held)}
            <CatalogBrowse {catalog} {held} />
          {/snippet}
        </CatalogHeldData>
      {/if}
    </div>
  {/snippet}
</Tabs>
