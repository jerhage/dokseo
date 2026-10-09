<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { OriginsListed } from './catalog-list';
  import { badgeFor } from './origin-filter';

  type Props = {
    readonly listed: OriginsListed;
    readonly id: BookId;
  };

  let { listed, id }: Props = $props();

  const catalog = $derived(badgeFor(listed, id));
</script>

{#if catalog !== null}
  <div class="row min-w-0">
    <Badge class="min-w-0" title="Downloaded from {catalog}"
      ><span class="truncate">from {catalog}</span></Badge
    >
  </div>
{/if}
