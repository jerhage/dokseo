<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { BookId } from '$lib/shared/ids';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import type { Book } from '../domain/book/book';
  import {
    booksQuery,
    coversQuery,
    librarySizeQuery,
    removedBooksQuery,
  } from '../queries/library-queries';
  import type { LibraryReads } from '../queries/library-queries';
  import { CoverUrls } from './cover-urls';
  import {
    failureOf,
    imageCountsOf,
    listedBooks,
    listedOf,
    removedEntries,
    shelfOf,
    shelfState,
    unreadableBooks,
    unreadableRemovedEntries,
  } from './library-shelf';
  import type { ShelfRead } from './library-shelf';

  type Props = {
    readonly library: LibraryReads;
    readonly lazy?: boolean;
    readonly children: Snippet<[ShelfRead]>;
  };

  let { library, lazy = false, children }: Props = $props();

  const NO_COVERS: ReadonlyMap<BookId, Blob> = new Map();

  let asked = $state(false);
  const wanted = $derived(!lazy || asked);

  const listing = readQuery(() => ({ ...booksQuery(library), enabled: wanted }));
  const books: readonly Book[] = $derived(listedBooks(listing.state));
  const ids = $derived(books.map((held) => held.id));
  const coverRead = readQuery(() => ({
    ...coversQuery(library, ids),
    enabled: wanted && listing.state.kind === 'ready',
  }));
  const sizing = readQuery(() => ({ ...librarySizeQuery(library), enabled: wanted }));
  const removedRead = readQuery(() => ({ ...removedBooksQuery(library), enabled: wanted }));

  const urls = new CoverUrls();
  const shown = $derived(
    urls.urlsFor(coverRead.state.kind === 'ready' ? coverRead.state.value : NO_COVERS),
  );
  const measured = $derived(sizing.state.kind === 'ready' ? sizing.state.value : null);
  const held = $derived(shelfState(listing.state, shown, measured));
  const covers = $derived(shelfOf(held).covers);
  const storedBytes = $derived(shelfOf(held).storedBytes);
  const failure = $derived(failureOf(held));
  const searched = $derived(books.map(listedOf));
  const counts = $derived(imageCountsOf(books));
  const unreadable = $derived(unreadableBooks(listing.state));
  const removed = $derived(removedEntries(removedRead.state));
  const unreadableRemoved = $derived(unreadableRemovedEntries(removedRead.state));

  function reload(): void {
    if (!wanted) {
      asked = true;
      return;
    }
    listing.reload();
    sizing.reload();
    removedRead.reload();
  }

  const shelf: ShelfRead = {
    get state() {
      return held;
    },
    get books() {
      return books;
    },
    get covers() {
      return covers;
    },
    get storedBytes() {
      return storedBytes;
    },
    get failure() {
      return failure;
    },
    get searched() {
      return searched;
    },
    get counts() {
      return counts;
    },
    get unreadable() {
      return unreadable;
    },
    get removed() {
      return removed;
    },
    get unreadableRemoved() {
      return unreadableRemoved;
    },
    reload,
  };

  onDestroy(() => urls.dispose());

  export function read(): ShelfRead {
    return shelf;
  }
</script>

{@render children(shelf)}
