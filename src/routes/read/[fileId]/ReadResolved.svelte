<script lang="ts">
  import type { Snippet } from 'svelte';
  import { goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import type { BookId, ContentHash } from '$lib/shared/ids';
  import { LIBRARY_AFTER_MISSING_BOOK } from '$lib/shared/reader-location';
  import { addressWithKey } from '$lib/shared/reader-target';
  import type { ReaderTarget } from '$lib/shared/reader-target';
  import { unreachable } from '$lib/shared/unreachable';

  type Props = {
    readonly target: ReaderTarget;
    readonly opened: Snippet<[{ readonly id: BookId; readonly key: ContentHash | null }]>;
    readonly elsewhere: Snippet<[string]>;
  };

  let { target, opened, elsewhere }: Props = $props();

  $effect(() => {
    if (target.kind === 'shelf-by-id') {
      replaceState(addressWithKey(new URL(location.href), target.key), page.state);
    } else if (target.kind === 'not-found') {
      void goto(LIBRARY_AFTER_MISSING_BOOK, { replaceState: true });
    }
  });
</script>

{#if target.kind === 'shelf' || target.kind === 'shelf-by-id' || target.kind === 'unreadable'}
  {@render opened({ id: target.id, key: target.key })}
{:else if target.kind === 'remote'}
  {@render elsewhere(target.contentHash)}
{:else if target.kind === 'awaiting-remote'}
  <EmptyState variant="fill" live message="Looking for this book…" />
{:else if target.kind === 'not-found'}
  <EmptyState variant="fill" live message="That book is no longer in your library." />
{:else}
  {unreachable(target)}
{/if}
