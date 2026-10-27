<script lang="ts">
  import type { Snippet } from 'svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { remoteBooksQuery } from '../queries/sync-queries';
  import type { RemoteBook } from '../use-cases/list-remote-books';
  import { remoteListOf } from './remote-books';
  import type { RemoteBooksUseCases } from './sync-deps';

  type Props = {
    readonly sync: Pick<RemoteBooksUseCases, 'remoteBooks'>;
    readonly enabled: boolean;
    readonly children: Snippet<[readonly RemoteBook[] | null]>;
  };

  let { sync, enabled, children }: Props = $props();

  const remote = readQuery(() => ({ ...remoteBooksQuery(sync), enabled }));
  const books = $derived(enabled ? remoteListOf(remote.state) : null);
</script>

{@render children(books)}
