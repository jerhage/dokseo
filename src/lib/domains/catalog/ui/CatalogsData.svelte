<script lang="ts">
  import type { Snippet } from 'svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import type { ReadState } from '$lib/shared/read-state';
  import { catalogsQuery } from '../queries/catalog-queries';
  import type { CatalogReads } from '../queries/catalog-queries';
  import type { ListCatalogsResult } from '../use-cases/list-catalogs';

  type Props = {
    readonly catalog: Pick<CatalogReads, 'listCatalogs'>;
    readonly children?: Snippet<[ReadState<ListCatalogsResult>]>;
  };

  let { catalog, children }: Props = $props();

  const listing = readQuery(() => catalogsQuery(catalog));

  export function read(): ReadState<ListCatalogsResult> {
    return listing.state;
  }
</script>

{@render children?.(listing.state)}
