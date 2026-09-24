<script lang="ts">
  import Progress from '$lib/components/Progress.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { Book } from '../../../domain/book/book';
  import { bookProgress } from '../../../domain/book/book-progress';
  import BookActions from './BookActions.svelte';
  import { bookFacts } from './library-shelves';
  import './book-grid.css';

  type Props = {
    readonly books: readonly Book[];
    readonly covers: ReadonlyMap<BookId, string>;
    readonly busy: (id: BookId) => boolean;
    readonly onedit: (id: BookId) => void;
    readonly onremove: (id: BookId) => void;
  };

  let { books, covers, busy, onedit, onremove }: Props = $props();
</script>

<ul class="book-grid grid-auto p-0" aria-label="Books">
  {#each books as book (book.id)}
    {@const progress = bookProgress(book)}
    {@const cover = covers.get(book.id) ?? null}
    <li class="col gap-2" aria-busy={busy(book.id)}>
      <a
        class="cover surface-sunken bordered rounded-container"
        href="/read/{book.id}"
        aria-label="Read {book.title}"
        title={bookFacts(book)}
      >
        {#if cover !== null}
          <img class="art" src={cover} alt="" />
        {/if}
      </a>
      {#if progress.kind === 'known'}
        <Progress label="Read so far in {book.title}" value={progress.filled} size="sm" />
      {/if}
      <div class="row items-start gap-1">
        <div class="col gap-1 flex-1">
          <h3 class="title text-sm truncate" lang={book.language}>{book.title}</h3>
          <p class="text-xs text-muted truncate">
            {progress.kind === 'known' ? progress.label : bookFacts(book)}
          </p>
        </div>
        <BookActions
          {book}
          busy={busy(book.id)}
          onedit={() => onedit(book.id)}
          onremove={() => onremove(book.id)}
        />
      </div>
    </li>
  {/each}
</ul>
