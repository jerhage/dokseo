<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import ContextMenu from '$lib/ui/components/ContextMenu.svelte';
  import { createContextMenuAreas } from '$lib/ui/components/context-menu-areas';
  import DropdownItem from '$lib/ui/components/DropdownItem.svelte';
  import DropdownSeparator from '$lib/ui/components/DropdownSeparator.svelte';
  import Progress from '$lib/ui/components/Progress.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { focusReturnFor } from '$lib/shared/focus-return';
  import type { FocusReturn } from '$lib/shared/focus-return';
  import { shownTitle } from '$lib/shared/shown-title';
  import type { BookId } from '$lib/shared/ids';
  import type { Book } from '../domain/book/book';
  import { bookProgress } from '../domain/book/book-progress';
  import BookActionItems from './BookActionItems.svelte';
  import { bookFacts } from './library-shelves';
  import { openClick } from './open-click';

  type Props = {
    readonly books: readonly Book[];
    readonly busy: (id: BookId) => boolean;
    readonly onedit: (id: BookId) => void;
    readonly onremove: (id: BookId) => void;
    readonly onfinish: (id: BookId) => void;
    readonly onunread: (id: BookId) => void;
    readonly ondetails: (id: BookId, from: FocusReturn | null) => void;
  };

  let { books, busy, onedit, onremove, onfinish, onunread, ondetails }: Props = $props();

  const rows = createContextMenuAreas<Book>();
</script>

<Table size="sm" aria-label="Books">
  <TableHeader>
    <TableRow>
      <TableHeaderCell scope="col">Title</TableHeaderCell>
      <TableHeaderCell scope="col">Position</TableHeaderCell>
      <TableHeaderCell scope="col">Details</TableHeaderCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each books as book (book.id)}
      {@const progress = bookProgress(book)}
      {@const name = shownTitle(book)}
      <TableRow
        class={{ 'is-busy': busy(book.id) }}
        aria-busy={busy(book.id)}
        {@attach rows.area(book)}
        {@attach openClick((event) =>
          ondetails(book.id, focusReturnFor(event.currentTarget, event.detail)),
        )}
      >
        <TableCell>
          <a
            class="weight-medium"
            href="/read/{book.id}"
            lang={book.language}
            onclick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              ondetails(book.id, focusReturnFor(event.currentTarget, event.detail));
            }}>{name}</a
          >
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
      </TableRow>
    {/each}
  </TableBody>
</Table>
<ContextMenu areas={rows} label={(book) => `Actions for ${shownTitle(book)}`}>
  {#snippet menu(book)}
    <DropdownItem href="/read/{book.id}" target="_blank" rel="noopener"
      >Open in new tab</DropdownItem
    >
    <DropdownSeparator />
    <BookActionItems
      {book}
      busy={busy(book.id)}
      onedit={() => onedit(book.id)}
      onremove={() => onremove(book.id)}
      onfinish={() => onfinish(book.id)}
      onunread={() => onunread(book.id)}
    />
  {/snippet}
</ContextMenu>
