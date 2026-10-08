<script lang="ts">
  import type { Snippet } from 'svelte';
  import Tabs from '$lib/ui/components/Tabs.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { CatalogTabsView } from './catalog-tabs.svelte';
  import CatalogBrowse from './CatalogBrowse.svelte';
  import { DEVICE_TAB, TABS_LABEL } from './library-tabs';

  type Props = {
    readonly view: CatalogTabsView;
    readonly readerHref: (id: BookId) => string;
    readonly device: Snippet;
  };

  let { view, readerHref, device }: Props = $props();
</script>

<Tabs
  tabs={view.tabs}
  label={TABS_LABEL}
  bind:selected={() => view.selected, (id) => view.select(id)}
>
  {#snippet panel(tab)}
    {@const catalog = view.catalogFor(tab.id)}
    {#if tab.id !== DEVICE_TAB && catalog !== null}
      <CatalogBrowse view={view.browsing(catalog)} {readerHref} />
    {/if}
  {/snippet}
</Tabs>

<div hidden={view.selected !== DEVICE_TAB}>
  {@render device()}
</div>
