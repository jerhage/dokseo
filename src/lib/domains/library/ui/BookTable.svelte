<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import Table from '$lib/components/Table.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { Book } from '../domain/book/book';
  import { bookProgress } from '../domain/book/book-progress';
  import BookActions from './BookActions.svelte';
  import { bookFacts } from './library-shelves';

  type Props = {
    readonly books: readonly Book[];
    readonly busy: (id: BookId) => boolean;
    readonly onedit: (id: BookId) => void;
    readonly onremove: (id: BookId) => void;
    readonly onfinish: (id: BookId) => void;
    readonly onunread: (id: BookId) => void;
  };

  let { books, busy, onedit, onremove, onfinish, onunread }: Props = $props();
</script>

<Table compact aria-label="Books">
  <thead>
    <tr>
      <th scope="col">Title</th>
      <th scope="col">Position</th>
      <th scope="col">Details</th>
      <th scope="col"><span class="visually-hidden">Actions</span></th>
    </tr>
  </thead>
  <tbody>
    {#each books as book (book.id)}
      {@const progress = bookProgress(book)}
      <tr class={{ 'is-busy': busy(book.id) }} aria-busy={busy(book.id)}>
        <td>
          <a class="weight-medium" href="/read/{book.id}" lang={book.language}>{book.title}</a>
        </td>
        <td>
          {#if book.finishedAt !== null}
            <div class="row">
              <Badge variant="success">Finished</Badge>
            </div>
          {:else if progress.kind === 'known'}
            <div class="col gap-1">
              <span class="text-xs mono">{progress.label}</span>
              <Progress label="Read so far in {book.title}" value={progress.filled} size="sm" />
            </div>
          {:else}
            <span class="text-xs text-faint">Unknown</span>
          {/if}
        </td>
        <td class="text-xs text-muted">{bookFacts(book)}</td>
        <td>
          <BookActions
            {book}
            busy={busy(book.id)}
            onedit={() => onedit(book.id)}
            onremove={() => onremove(book.id)}
            onfinish={() => onfinish(book.id)}
            onunread={() => onunread(book.id)}
          />
        </td>
      </tr>
    {/each}
  </tbody>
</Table>
