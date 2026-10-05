<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Progress from '$lib/ui/components/Progress.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { shownTitle } from '$lib/shared/shown-title';
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

<Table size="sm" aria-label="Books">
  <TableHeader>
    <TableRow>
      <TableHeaderCell scope="col">Title</TableHeaderCell>
      <TableHeaderCell scope="col">Position</TableHeaderCell>
      <TableHeaderCell scope="col">Details</TableHeaderCell>
      <TableHeaderCell scope="col" actions>
        <span class="visually-hidden">Actions</span>
      </TableHeaderCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each books as book (book.id)}
      {@const progress = bookProgress(book)}
      {@const name = shownTitle(book)}
      <TableRow class={{ 'is-busy': busy(book.id) }} aria-busy={busy(book.id)}>
        <TableCell>
          <a class="weight-medium" href="/read/{book.id}" lang={book.language}>{name}</a>
        </TableCell>
        <TableCell>
          {#if book.finishedAt !== null}
            <div class="row">
              <Badge variant="success">Finished</Badge>
            </div>
          {:else if progress.kind === 'known'}
            <div class="col gap-1">
              <span class="text-xs mono">{progress.label}</span>
              <Progress label="Read so far in {name}" value={progress.filled} size="sm" />
            </div>
          {:else}
            <span class="text-xs text-faint">Unknown</span>
          {/if}
        </TableCell>
        <TableCell class="text-xs text-muted">{bookFacts(book)}</TableCell>
        <TableCell actions>
          <BookActions
            {book}
            busy={busy(book.id)}
            onedit={() => onedit(book.id)}
            onremove={() => onremove(book.id)}
            onfinish={() => onfinish(book.id)}
            onunread={() => onunread(book.id)}
          />
        </TableCell>
      </TableRow>
    {/each}
  </TableBody>
</Table>
