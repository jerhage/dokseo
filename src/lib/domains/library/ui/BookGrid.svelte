<script lang="ts">
  import type { Snippet } from 'svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Card from '$lib/ui/components/Card.svelte';
  import ContextMenu from '$lib/ui/components/ContextMenu.svelte';
  import DropdownItem from '$lib/ui/components/DropdownItem.svelte';
  import DropdownSeparator from '$lib/ui/components/DropdownSeparator.svelte';
  import Progress from '$lib/ui/components/Progress.svelte';
  import Thumbnail from '$lib/ui/components/Thumbnail.svelte';
  import { focusReturnFor } from '$lib/shared/focus-return';
  import type { FocusReturn } from '$lib/shared/focus-return';
  import { shownTitle } from '$lib/shared/shown-title';
  import type { BookId } from '$lib/shared/ids';
  import type { Book } from '../domain/book/book';
  import { bookProgress } from '../domain/book/book-progress';
  import BookActionItems from './BookActionItems.svelte';
  import { bookFacts } from './library-shelves';

  type Props = {
    readonly books: readonly Book[];
    readonly covers: ReadonlyMap<BookId, string>;
    readonly busy: (id: BookId) => boolean;
    readonly onedit: (id: BookId) => void;
    readonly onremove: (id: BookId) => void;
    readonly onfinish: (id: BookId) => void;
    readonly onunread: (id: BookId) => void;
    readonly ondetails: (id: BookId, from: FocusReturn | null) => void;
    readonly bookBadge?: Snippet<[BookId]> | undefined;
  };

  let { books, covers, busy, onedit, onremove, onfinish, onunread, ondetails, bookBadge }: Props =
    $props();
</script>

<ul class="grid-auto grid-auto-sm p-0" aria-label="Books">
  {#each books as book (book.id)}
    {@const progress = bookProgress(book)}
    {@const name = shownTitle(book)}
    {@const cover = covers.get(book.id) ?? null}
    <li class={['col gap-2', { 'is-busy': busy(book.id) }]} aria-busy={busy(book.id)}>
      <ContextMenu label="Actions for {name}">
        {#snippet menu()}
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
        <Card
          mediaRatio="portrait"
          aria-label={name}
          tooltip={bookFacts(book)}
          onclick={(event) => ondetails(book.id, focusReturnFor(event.currentTarget, event.detail))}
        >
          {#snippet media()}
            <Thumbnail src={cover} fill />
          {/snippet}
        </Card>
        {#if book.finishedAt !== null}
          <div class="row">
            <Badge variant="success">Finished</Badge>
          </div>
        {:else if progress.kind === 'known'}
          <Progress label="Read so far in {name}" value={progress.filled} size="sm" />
        {/if}
        <div class="row items-start gap-1">
          <div class="col gap-1 flex-1">
            <h3 class="text-sm weight-medium truncate" lang={book.language}>{name}</h3>
            <p class="text-xs text-muted truncate">
              {progress.kind === 'known' ? progress.label : bookFacts(book)}
            </p>
          </div>
        </div>
        {@render bookBadge?.(book.id)}
      </ContextMenu>
    </li>
  {/each}
</ul>
