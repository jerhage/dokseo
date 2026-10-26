<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import type { Snippet } from 'svelte';
  import type { Notify } from '$lib/shared/notice';
  import { shownTitle } from '$lib/shared/shown-title';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import { syncKeys } from '../queries/sync-keys';
  import { remoteBooksQuery } from '../queries/sync-queries';
  import type { RemoteBook } from '../use-cases/list-remote-books';
  import { remoteBookRow, remoteBooksView } from './remote-books';
  import type { UnlockRequest } from './remote-downloads';
  import { createRemoteDownloads } from './remote-downloads.svelte';
  import type { DownloadChoiceSource, RemoteBooksUseCases } from './sync-deps';

  type Props = {
    readonly sync: RemoteBooksUseCases;
    readonly choices: DownloadChoiceSource;
    readonly notify: Notify;
    readonly unlock: Snippet<[UnlockRequest]>;
    readonly ondownloaded: () => void;
  };

  let { sync, choices, notify, unlock, ondownloaded }: Props = $props();

  const client = useQueryClient();
  const remote = readQuery(() => remoteBooksQuery(sync));
  const view = $derived(remoteBooksView(remote.state));
  const downloads = createRemoteDownloads();

  async function download(book: RemoteBook): Promise<void> {
    const outcome = await downloads.start(book.contentHash, (onProgress) =>
      sync.downloadRemoteBook(
        book.contentHash,
        { matching: choices.matching(), defaults: choices.defaults() },
        onProgress,
      ),
    );
    if (outcome?.kind !== 'done') return;
    notify({ tone: 'success', title: `Added ${shownTitle(book)}` });
    void client.invalidateQueries({ queryKey: syncKeys.remoteBooks() });
    ondownloaded();
  }

  function unlocked(): void {
    const { ask } = downloads;
    downloads.dismissAsk();
    if (ask.kind !== 'asking' || view.kind !== 'listed') return;
    const book = view.books.find((candidate) => candidate.contentHash === ask.contentHash);
    if (book !== undefined) void download(book);
  }
</script>

{#if view.kind === 'listed'}
  <ListGroup title="On your other devices" variant="inset">
    {#each view.books as book (book.contentHash)}
      {@const state = downloads.stateOf(book.contentHash)}
      {@const row = remoteBookRow(book, state)}
      {#if row.downloadable}
        <ListRow title={row.title} description={row.status} size="sm">
          {#snippet actions()}
            <Button
              size="sm"
              variant="outline"
              loading={state.kind === 'running'}
              disabled={state.kind === 'running'}
              onclick={() => void download(book)}
            >
              {row.action}
            </Button>
          {/snippet}
        </ListRow>
      {:else}
        <ListRow title={row.title} description={row.status} size="sm" />
      {/if}
    {/each}
  </ListGroup>
{/if}

{#if downloads.ask.kind === 'asking'}
  {@render unlock({
    catalogId: downloads.ask.catalogId,
    refused: downloads.ask.refused,
    onunlocked: unlocked,
    ondismiss: () => downloads.dismissAsk(),
  })}
{/if}
