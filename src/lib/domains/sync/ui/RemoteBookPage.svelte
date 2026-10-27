<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import type { Snippet } from 'svelte';
  import type { Notify } from '$lib/shared/notice';
  import PageTitle from '$lib/shared/PageTitle.svelte';
  import { shownTitle } from '$lib/shared/shown-title';
  import Button from '$lib/ui/components/Button.svelte';
  import IconButton from '$lib/ui/components/IconButton.svelte';
  import SelectedShelfIcon from '$lib/ui/components/icons/SelectedShelf.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import { syncKeys } from '../queries/sync-keys';
  import type { RemoteBook } from '../use-cases/list-remote-books';
  import { OTHER_DEVICE_TITLE, remoteBookRow } from './remote-books';
  import type { UnlockRequest } from './remote-downloads';
  import { createRemoteDownloads } from './remote-downloads.svelte';
  import type { DownloadChoiceSource, RemoteBooksUseCases } from './sync-deps';

  type Props = {
    readonly book: RemoteBook;
    readonly sync: RemoteBooksUseCases;
    readonly choices: DownloadChoiceSource;
    readonly notify: Notify;
    readonly unlock: Snippet<[UnlockRequest]>;
    readonly ondownloaded: () => void;
  };

  let { book, sync, choices, notify, unlock, ondownloaded }: Props = $props();

  const client = useQueryClient();
  const downloads = createRemoteDownloads();
  const state = $derived(downloads.stateOf(book.contentHash));
  const row = $derived(remoteBookRow(book, state));

  async function download(): Promise<void> {
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
    if (ask.kind === 'asking') void download();
  }
</script>

<PageTitle screen={OTHER_DEVICE_TITLE} />

<div class="layout-app-shell">
  <header class="layout-app-shell-header">
    <div class="row items-center gap-2 min-w-0">
      <IconButton href="/" variant="ghost" label="Your library" tooltip={false}
        ><SelectedShelfIcon class="brand-mark" /></IconButton
      >
      <span class="display weight-semibold">Library</span>
    </div>
  </header>

  <main class="layout-main-area" tabindex="-1">
    <div class="col gap-4 prose">
      <h1 class="text-lg">{OTHER_DEVICE_TITLE}</h1>
      <ListGroup variant="inset">
        {#if row.downloadable}
          <ListRow title={row.title} description={row.status} size="sm">
            {#snippet actions()}
              <Button
                size="sm"
                variant="outline"
                loading={state.kind === 'running'}
                disabled={state.kind === 'running'}
                onclick={() => void download()}
              >
                {row.action}
              </Button>
            {/snippet}
          </ListRow>
        {:else}
          <ListRow title={row.title} description={row.status} size="sm" />
        {/if}
      </ListGroup>
    </div>
  </main>
</div>

{#if downloads.ask.kind === 'asking'}
  {@render unlock({
    catalogId: downloads.ask.catalogId,
    refused: downloads.ask.refused,
    onunlocked: unlocked,
    ondismiss: () => downloads.dismissAsk(),
  })}
{/if}
