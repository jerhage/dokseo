<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { OriginFilterView } from './origin-filter.svelte';

  type Props = {
    readonly view: OriginFilterView;
    readonly id: BookId;
  };

  let { view, id }: Props = $props();

  const catalog = $derived(view.badgeFor(id));
</script>

{#if catalog !== null}
  <div class="row min-w-0">
    <Badge class="min-w-0" title="Downloaded from {catalog}"
      ><span class="truncate">from {catalog}</span></Badge
    >
  </div>
{/if}
