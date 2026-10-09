<script lang="ts">
  import type { Snippet } from 'svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { readBoth } from '$lib/shared/read-state';
  import type { ReadState } from '$lib/shared/read-state';
  import { catalogsQuery, originsQuery } from '../queries/catalog-queries';
  import type { CatalogReads } from '../queries/catalog-queries';
  import type { OriginsListing } from './catalog-list';

  type Props = {
    readonly catalog: CatalogReads;
    readonly children?: Snippet<[ReadState<OriginsListing>]>;
  };

  let { catalog, children }: Props = $props();

  const catalogs = readQuery(() => catalogsQuery(catalog));
  const origins = readQuery(() => originsQuery(catalog));
  const joined = $derived(
    readBoth(catalogs.state, origins.state, (listedCatalogs, listedOrigins) => ({
      catalogs: listedCatalogs,
      origins: listedOrigins,
    })),
  );

  export function read(): ReadState<OriginsListing> {
    return joined;
  }
</script>

{@render children?.(joined)}
