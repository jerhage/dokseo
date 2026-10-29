<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import type { Snippet } from 'svelte';
  import { getToaster } from '$lib/ui/components/toast-context';
  import type { Container } from '$lib/container';
  import CatalogUnlockPrompt from '$lib/domains/catalog/ui/CatalogUnlockPrompt.svelte';
  import { refreshOrigins } from '$lib/domains/catalog/ui/catalog-refresh';
  import { CATALOG_NEEDS } from '$lib/domains/library/ui/catalog-needs';
  import { refreshLibrary } from '$lib/domains/library/ui/library-refresh';
  import ShelfKeysData from '$lib/domains/library/ui/ShelfKeysData.svelte';
  import RemoteBookPage from '$lib/domains/sync/ui/RemoteBookPage.svelte';
  import RemoteBooksData from '$lib/domains/sync/ui/RemoteBooksData.svelte';
  import type { UnlockRequest } from '$lib/domains/sync/ui/remote-downloads';
  import type { BookId, ContentHash } from '$lib/shared/ids';
  import { toastNotify } from '$lib/shared/notice-toast';
  import { readerTarget } from '$lib/shared/reader-target';
  import ReadResolved from './ReadResolved.svelte';

  type Props = {
    readonly container: Container;
    readonly parameter: string;
    readonly opened: Snippet<[{ readonly id: BookId; readonly key: ContentHash | null }]>;
  };

  let { container, parameter, opened }: Props = $props();

  const queryClient = useQueryClient();
  const notify = toastNotify(getToaster());
</script>

{#snippet unlock(request: UnlockRequest)}
  <CatalogUnlockPrompt catalog={container.catalog} {...request} />
{/snippet}

<ShelfKeysData library={container.library}>
  {#snippet children(entries, unreadable)}
    {@const shelfOnly = readerTarget(parameter, entries, unreadable, null)}
    <RemoteBooksData sync={container.sync} enabled={shelfOnly.kind === 'awaiting-remote'}>
      {#snippet children(remote)}
        <ReadResolved
          target={readerTarget(
            parameter,
            entries,
            unreadable,
            remote?.map((book) => book.contentHash) ?? null,
          )}
          {opened}
        >
          {#snippet elsewhere(hash)}
            {@const book = remote?.find((candidate) => candidate.contentHash === hash)}
            {#if book !== undefined}
              <RemoteBookPage
                {book}
                sync={container.sync}
                choices={CATALOG_NEEDS}
                {notify}
                {unlock}
                ondownloaded={() =>
                  void Promise.all([refreshLibrary(queryClient), refreshOrigins(queryClient)])}
              />
            {/if}
          {/snippet}
        </ReadResolved>
      {/snippet}
    </RemoteBooksData>
  {/snippet}
</ShelfKeysData>
