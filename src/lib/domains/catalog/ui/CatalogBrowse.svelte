<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Breadcrumb from '$lib/ui/components/Breadcrumb.svelte';
  import type { Catalog } from '../domain/catalog';
  import type { BookOriginLink } from '../domain/remote-item';
  import { useCatalogDeps } from './catalog-context';
  import { CatalogDownloads } from './catalog-downloads.svelte';
  import { searchFieldFor } from './catalog-search-field';
  import CatalogPlace from './CatalogPlace.svelte';
  import CatalogSearchField from './CatalogSearchField.svelte';
  import { forgetDangling } from './dangling-origins';

  type Props = {
    readonly catalog: Catalog;
    readonly held: ReadonlyMap<string, BookOriginLink> | null;
  };

  let { catalog, held }: Props = $props();

  const deps = useCatalogDeps();

  const downloads = new CatalogDownloads(
    deps.cases,
    deps.choices,
    {
      describeOpenFile: deps.describeOpenFile,
      downloaded: deps.downloaded,
      updated: deps.updated,
    },
    () => held ?? new Map(),
  );

  const place = $derived(deps.navigation.placeOf(catalog.id));
  const crumbs = $derived(
    deps.navigation.crumbs(catalog.id, catalog.title).map(({ label, place: target }) => ({
      label,
      onselect: () => deps.navigation.ascend(target),
    })),
  );
  const field = $derived(searchFieldFor(catalog, deps));

  onMount(() => {
    void forgetDangling(deps.cases, catalog.id, deps.refreshOrigins);
  });

  onDestroy(() => downloads.dispose());
</script>

<div class="col gap-4">
  <CatalogSearchField {field} />
  <Breadcrumb items={crumbs} label="Catalog path" />

  {#if place !== null}
    {#key `${place.id}:${JSON.stringify(place.location)}`}
      <CatalogPlace {catalog} placeId={place.id} {downloads} {held} />
    {/key}
  {/if}
</div>
