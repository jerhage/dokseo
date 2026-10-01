<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { BookId } from '$lib/shared/ids';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { bookQuery } from '../queries/library-queries';
  import type { LibraryReads } from '../queries/library-queries';
  import { bookReadOf } from './book-read';
  import type { BookRead } from './book-read';

  type Props = {
    readonly library: Pick<LibraryReads, 'readBook'>;
    readonly id: BookId | null;
    readonly children: Snippet<[BookRead]>;
  };

  let { library, id, children }: Props = $props();

  const reading = readQuery(() => bookQuery(library, id));
  const read = $derived(bookReadOf(reading.state));
</script>

{@render children(read)}
