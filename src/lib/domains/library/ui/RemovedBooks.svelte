<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import ListGroup from '$lib/components/ListGroup.svelte';
  import ListRow from '$lib/components/ListRow.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { RemovedBook } from '../domain/book/removed-book';
  import { RESTORE_HINT, removedBookName } from './removed-books';

  type Props = {
    readonly books: readonly RemovedBook[];
    readonly busy: boolean;
    readonly ondelete: (id: BookId) => void;
  };

  let { books, busy, ondelete }: Props = $props();
</script>

<ListGroup title="Removed books" variant="inset">
  {#each books as book (book.id)}
    <ListRow title={removedBookName(book)} description={RESTORE_HINT} size="sm">
      {#snippet actions()}
        <Button size="sm" variant="outline" disabled={busy} onclick={() => ondelete(book.id)}
          >Delete captures</Button
        >
      {/snippet}
    </ListRow>
  {/each}
</ListGroup>
