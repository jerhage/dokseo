<script lang="ts">
  import type { Snippet } from 'svelte';
  import Tabs from '$lib/ui/components/Tabs.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { CatalogHeaderSearch } from './catalog-header-search.svelte';
  import type { CatalogTabsView } from './catalog-tabs.svelte';
  import CatalogBrowse from './CatalogBrowse.svelte';
  import { DEVICE_TAB, TABS_LABEL } from './library-tabs';

  type Props = {
    readonly view: CatalogTabsView;
    readonly search: CatalogHeaderSearch;
    readonly readerHref: (id: BookId) => string;
    readonly device: Snippet;
  };

  let { view, search, readerHref, device }: Props = $props();
</script>

<Tabs
  tabs={view.tabs}
  label={TABS_LABEL}
  keepMounted
  bind:selected={() => view.selected, (id) => view.select(id)}
>
  {#snippet panel(tab)}
    {@const catalog = view.catalogFor(tab.id)}
    <div class="col gap-6 pt-6">
      {#if tab.id === DEVICE_TAB}
        {@render device()}
      {:else if catalog !== null && view.hasBeenShown(tab.id)}
        <CatalogBrowse
          view={view.browsing(catalog)}
          search={search.fieldFor(catalog)}
          {readerHref}
        />
      {/if}
    </div>
  {/snippet}
</Tabs>
