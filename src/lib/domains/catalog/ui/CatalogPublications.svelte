<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { CatalogBrowseView } from './catalog-browse.svelte';
  import PublicationDetails from './PublicationDetails.svelte';
  import RemoteCard from './RemoteCard.svelte';
  import ReplaceBookModal from './ReplaceBookModal.svelte';

  type Props = {
    readonly view: CatalogBrowseView;
    readonly publications: CatalogBrowseView['entries'];
    readonly readerHref: (id: BookId) => string;
  };

  let { view, publications, readerHref }: Props = $props();

  const queue = $derived(view.downloads.queue);
  const selection = $derived(view.selection);
  const selectable = $derived(selection.selectable);
  const count = $derived(selection.count);
</script>

{#if publications.length === 0}
  <EmptyState message="No books here." />
{:else}
  {#if selectable.length > 0 || queue !== null}
    <div class="row wrap items-center gap-2">
      {#if selectable.length > 0}
        <Button size="sm" onclick={() => selection.selectAll()}>Select all</Button>
        <Button size="sm" disabled={count === 0} onclick={() => selection.clear()}>Clear</Button>
        <Button
          size="sm"
          variant="primary"
          disabled={count === 0 || queue !== null}
          onclick={() => void selection.downloadSelected()}
        >
          Download selected ({count})
        </Button>
      {/if}
      {#if queue !== null}
        <span class="text-sm text-muted" aria-live="polite"
          >Downloading {queue.position} of {queue.total}</span
        >
        <Button size="sm" onclick={() => view.downloads.cancelAll()}>Cancel all</Button>
      {/if}
    </div>
  {/if}
  <ul class="grid-auto grid-auto-sm p-0" aria-label="Books">
    {#each publications as { publication, feedPosition } (publication.entryId)}
      <RemoteCard
        item={view.downloads.itemFor(publication)}
        cover={view.covers.urlOf(publication.entryId)}
        selected={selection.has(publication.entryId)}
        {readerHref}
        ondownload={() => void view.downloads.start(publication, feedPosition)}
        oncancel={() => view.downloads.cancel(publication.entryId)}
        onreplace={() => view.downloads.askToReplace(publication, feedPosition)}
        ontoggle={() => selection.toggle(publication.entryId)}
        ondetails={() => view.openDetails(publication.entryId)}
      />
    {/each}
  </ul>
{/if}

{#if view.opened !== null}
  <PublicationDetails {view} {readerHref} />
{/if}

{#if view.downloads.replacement !== null}
  <ReplaceBookModal downloads={view.downloads} />
{/if}
