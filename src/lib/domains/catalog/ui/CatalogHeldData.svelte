<script lang="ts">
  import type { Snippet } from 'svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import type { Catalog } from '../domain/catalog';
  import type { BookOriginLink } from '../domain/remote-item';
  import { heldOriginsQuery } from '../queries/catalog-feed-queries';
  import type { HeldReads } from '../queries/catalog-feed-queries';
  import { heldOf } from './catalog-feed-read';

  type Props = {
    readonly catalog: Catalog;
    readonly cases: HeldReads;
    readonly children: Snippet<[ReadonlyMap<string, BookOriginLink> | null]>;
  };

  let { catalog, cases, children }: Props = $props();

  const held = readQuery(() => heldOriginsQuery(cases, catalog.id));
  const current = $derived(held.state.kind === 'loading' ? null : heldOf(held.state));
</script>

{@render children(current)}
