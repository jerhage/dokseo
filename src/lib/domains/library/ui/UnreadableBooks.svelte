<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { Book } from '../domain/book/book';
  import type { UnreadableBook } from '../domain/book/stored-book';
  import {
    mergeLabel,
    mergeTargets,
    unreadableBookName,
    unreadableBooksTitle,
  } from './unreadable-books';

  type Props = {
    readonly books: readonly UnreadableBook[];
    readonly shelf: readonly Book[];
    readonly busy: boolean;
    readonly onremove: (id: BookId) => void;
    readonly onremoveall: () => void;
    readonly onmerge: (id: BookId, into: Book) => void;
  };

  let { books, shelf, busy, onremove, onremoveall, onmerge }: Props = $props();

  const targets = $derived(mergeTargets(books, shelf));
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
          {@const target = targets.get(book.id)}
          {#if target !== undefined}
            <Button
              size="sm"
              variant="primary"
              disabled={busy}
              onclick={() => onmerge(book.id, target)}>{mergeLabel(target)}</Button
            >
          {/if}
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
