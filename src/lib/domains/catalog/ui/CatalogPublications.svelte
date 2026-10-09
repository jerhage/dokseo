<script lang="ts">
  import { onDestroy } from 'svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { Catalog } from '../domain/catalog';
  import { CatalogCovers } from './catalog-covers';
  import type { CatalogDownloads, QueuedDownload } from './catalog-downloads.svelte';
  import type { createDetails } from './details-focus';
  import type { createNavigation } from './navigation.svelte';
  import { openedPublication } from './remote-details';
  import { chosenOf, entryIdsOf, selectableOf } from './selection-rules';
  import type { createSelection } from './selection.svelte';
  import PublicationDetails from './PublicationDetails.svelte';
  import RemoteCard from './RemoteCard.svelte';
  import ReplaceBookModal from './ReplaceBookModal.svelte';

  type Props = {
    readonly catalog: Catalog;
    readonly publications: readonly QueuedDownload[];
    readonly blobs: ReadonlyMap<string, Blob>;
    readonly downloads: CatalogDownloads;
    readonly selection: ReturnType<typeof createSelection>;
    readonly details: ReturnType<typeof createDetails>;
    readonly navigation: ReturnType<typeof createNavigation>;
    readonly readerHref: (id: BookId) => string;
  };

  let {
    catalog,
    publications,
    blobs,
    downloads,
    selection,
    details,
    navigation,
    readerHref,
  }: Props = $props();

  const covers = new CatalogCovers(() => blobs);
  onDestroy(() => covers.dispose());

  const listed = $derived(
    publications.map(({ publication, feedPosition }) => ({
      publication,
      feedPosition,
      item: downloads.itemFor(publication),
    })),
  );
  const selectable = $derived(selectableOf(listed));
  const chosen = $derived(chosenOf(listed, selection.chosen));
  const queue = $derived(downloads.queue);
  const opened = $derived(
    openedPublication(listed, navigation.detailsOf(catalog.id), (id) => covers.urlOf(id)),
  );

  function entryOf(entryId: string) {
    return listed.find(({ publication }) => publication.entryId === entryId);
  }

  function download(): void {
    void downloads.downloadAll(chosen, ({ entryId }) => selection.drop(entryId));
  }
</script>

{#if publications.length === 0}
  <EmptyState message="No books here." />
{:else}
  {#if selectable.length > 0 || queue !== null}
    <div class="row wrap items-center gap-2">
      {#if selectable.length > 0}
        <Button size="sm" onclick={() => selection.selectAll(entryIdsOf(selectable))}>
          Select all
        </Button>
        <Button size="sm" disabled={chosen.length === 0} onclick={() => selection.clear()}>
          Clear
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={chosen.length === 0 || queue !== null}
          onclick={download}
        >
          Download selected ({chosen.length})
        </Button>
      {/if}
      {#if queue !== null}
        <span class="text-sm text-muted" aria-live="polite"
          >Downloading {queue.position} of {queue.total}</span
        >
        <Button size="sm" onclick={() => downloads.cancelAll()}>Cancel all</Button>
      {/if}
    </div>
  {/if}
  <ul class="grid-auto grid-auto-sm p-0" aria-label="Books">
    {#each listed as { publication, feedPosition, item } (publication.entryId)}
      <RemoteCard
        {item}
        cover={covers.urlOf(publication.entryId)}
        selected={selection.chosen.has(publication.entryId)}
        {readerHref}
        ondownload={() => void downloads.start(publication, feedPosition)}
        oncancel={() => downloads.cancel(publication.entryId)}
        onreplace={() => downloads.askToReplace(publication, feedPosition)}
        ontoggle={() => selection.toggle(publication.entryId)}
        ondetails={(from) => {
          details.remember(from);
          navigation.openDetails(publication.entryId);
        }}
      />
    {/each}
  </ul>
{/if}

{#if opened !== null}
  <PublicationDetails
    {opened}
    {readerHref}
    onclose={() => {
      details.restoreFocus();
      navigation.closeDetails();
    }}
    ongone={() => details.restoreFocus()}
    ondownload={() => {
      const entry = entryOf(opened.publication.entryId);
      if (entry !== undefined) void downloads.start(entry.publication, entry.feedPosition);
    }}
    oncancel={() => downloads.cancel(opened.publication.entryId)}
    onreplace={() => {
      const entry = entryOf(opened.publication.entryId);
      if (entry !== undefined) downloads.askToReplace(entry.publication, entry.feedPosition);
    }}
  />
{/if}

{#if downloads.replacement !== null}
  <ReplaceBookModal {downloads} />
{/if}
