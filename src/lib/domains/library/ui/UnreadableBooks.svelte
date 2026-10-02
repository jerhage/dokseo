<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import ListGroup from '$lib/components/ListGroup.svelte';
  import ListRow from '$lib/components/ListRow.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { UnreadableBook } from '../domain/book/stored-book';
  import { unreadableBookName, unreadableBooksTitle } from './unreadable-books';

  type Props = {
    readonly books: readonly UnreadableBook[];
    readonly busy: boolean;
    readonly onremove: (id: BookId) => void;
    readonly onremoveall: () => void;
  };

  let { books, busy, onremove, onremoveall }: Props = $props();
</script>

<Alert variant="warning" title={unreadableBooksTitle(books.length)}>
  <p>
    These books were stored in a shape this version cannot read. Upload the same file again to
    repair it. Remove them to clear this notice.
  </p>
  <ListGroup variant="inset">
    {#each books as book (book.id)}
      <ListRow title={unreadableBookName(book)} size="sm">
        {#snippet actions()}
          <Button size="sm" variant="outline" disabled={busy} onclick={() => onremove(book.id)}
            >Remove</Button
          >
        {/snippet}
      </ListRow>
    {/each}
  </ListGroup>
  {#snippet actions()}
    <Button size="sm" variant="danger" disabled={busy} onclick={onremoveall}>Remove all</Button>
  {/snippet}
</Alert>
