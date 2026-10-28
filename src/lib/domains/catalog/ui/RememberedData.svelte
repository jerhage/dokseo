<script lang="ts">
  import type { Snippet } from 'svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import type { CatalogId } from '$lib/shared/ids';
  import { rememberedPasswordsQuery } from '../queries/catalog-queries';
  import type { CatalogReads } from '../queries/catalog-queries';
  import { rememberedIdsOf } from './catalog-list';

  type Props = {
    readonly catalog: Pick<CatalogReads, 'listRememberedPasswords'>;
    readonly children: Snippet<[ReadonlySet<CatalogId>]>;
  };

  let { catalog, children }: Props = $props();

  const listing = readQuery(() => rememberedPasswordsQuery(catalog));
  const ids = $derived(rememberedIdsOf(listing.state));
</script>

{#if ids !== null}
  {@render children(ids)}
{/if}
