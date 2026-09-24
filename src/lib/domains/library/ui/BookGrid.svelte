<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { Book } from '../domain/book/book';
  import { bookProgress } from '../domain/book/book-progress';
  import BookActions from './BookActions.svelte';
  import { bookFacts } from './library-shelves';

  type Props = {
    readonly books: readonly Book[];
    readonly covers: ReadonlyMap<BookId, string>;
    readonly busy: (id: BookId) => boolean;
    readonly onedit: (id: BookId) => void;
    readonly onremove: (id: BookId) => void;
    readonly onfinish: (id: BookId) => void;
    readonly onunread: (id: BookId) => void;
  };

  let { books, covers, busy, onedit, onremove, onfinish, onunread }: Props = $props();
</script>

<ul class="grid-auto grid-auto-sm p-0" aria-label="Books">
  {#each books as book (book.id)}
    {@const progress = bookProgress(book)}
    {@const cover = covers.get(book.id) ?? null}
    <li class={['col gap-2', { 'is-busy': busy(book.id) }]} aria-busy={busy(book.id)}>
      <a
        class="card card-interactive aspect-portrait surface-sunken"
        href="/read/{book.id}"
        aria-label="Read {book.title}"
        title={bookFacts(book)}
      >
        {#if cover !== null}
          <img class="object-cover" src={cover} alt="" />
        {/if}
      </a>
      {#if book.finishedAt !== null}
        <div class="row">
          <Badge variant="success">Finished</Badge>
        </div>
      {:else if progress.kind === 'known'}
        <Progress label="Read so far in {book.title}" value={progress.filled} size="sm" />
      {/if}
      <div class="row items-start gap-1">
        <div class="col gap-1 flex-1">
          <h3 class="text-sm weight-medium truncate" lang={book.language}>{book.title}</h3>
          <p class="text-xs text-muted truncate">
            {progress.kind === 'known' ? progress.label : bookFacts(book)}
          </p>
        </div>
        <BookActions
          {book}
          busy={busy(book.id)}
          onedit={() => onedit(book.id)}
          onremove={() => onremove(book.id)}
          onfinish={() => onfinish(book.id)}
          onunread={() => onunread(book.id)}
        />
      </div>
    </li>
  {/each}
</ul>
