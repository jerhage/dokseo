<script lang="ts">
  import type { BookId } from '$lib/shared/ids';
  import type { OriginFilterView } from './origin-filter.svelte';

  type Props = {
    readonly view: OriginFilterView;
    readonly id: BookId;
  };

  let { view, id }: Props = $props();
</script>

<p class="text-sm text-muted">{view.sourceFor(id)}</p>
