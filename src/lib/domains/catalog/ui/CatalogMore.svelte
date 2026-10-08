<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import type { CatalogBrowseView } from './catalog-browse.svelte';
  import { browseFailureText } from './catalog-texts';
  import { reachEnd } from './reach-end';

  type Props = { readonly view: CatalogBrowseView };

  let { view }: Props = $props();

  const more = $derived(view.more);
</script>

{#if view.paging.next !== null}
  {#if more.kind === 'failed'}
    <Alert variant="warning" title="More books could not be loaded.">
      {browseFailureText(more.failure)}
      {#snippet actions()}
        <Button size="sm" onclick={() => void view.loadMore()}>Try again</Button>
      {/snippet}
    </Alert>
  {:else if more.kind === 'loading'}
    <div class="row justify-center">
      <span class="text-sm text-muted" aria-live="polite">Loading more…</span>
    </div>
  {:else}
    <div class="row justify-center" {@attach reachEnd(() => void view.loadMore())}>
      <Button size="sm" onclick={() => void view.loadMore()}>Load more</Button>
    </div>
  {/if}
{/if}
