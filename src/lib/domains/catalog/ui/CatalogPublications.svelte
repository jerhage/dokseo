<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { CatalogBrowseView } from './catalog-browse.svelte';
  import RemoteCard from './RemoteCard.svelte';

  type Props = {
    readonly view: CatalogBrowseView;
    readonly publications: CatalogBrowseView['entries'];
    readonly readerHref: (id: BookId) => string;
  };

  let { view, publications, readerHref }: Props = $props();

  const queue = $derived(view.downloads.queue);
</script>

{#if publications.length === 0}
  <EmptyState message="No books here." />
{:else}
  <div class="row wrap items-center gap-2">
    {#if queue === null}
      <Button size="sm" onclick={() => void view.downloads.downloadAll(publications)}>
        Download all
      </Button>
    {:else}
      <span class="text-sm text-muted" aria-live="polite"
        >Downloading {queue.position} of {queue.total}</span
      >
      <Button size="sm" onclick={() => view.downloads.cancelAll()}>Cancel all</Button>
    {/if}
  </div>
  <ul class="grid-auto grid-auto-sm p-0" aria-label="Books">
    {#each publications as { publication, feedPosition } (publication.entryId)}
      <RemoteCard
        item={view.downloads.itemFor(publication)}
        cover={view.covers.urlOf(publication.entryId)}
        {readerHref}
        ondownload={() => void view.downloads.start(publication, feedPosition)}
        oncancel={() => view.downloads.cancel(publication.entryId)}
      />
    {/each}
  </ul>
{/if}
