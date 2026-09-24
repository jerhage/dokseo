<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { Book } from '../../../domain/book/book';
  import { bookProgress } from '../../../domain/book/book-progress';
  import './continue-reading.css';

  type Props = {
    readonly books: readonly Book[];
    readonly covers: ReadonlyMap<BookId, string>;
  };

  let { books, covers }: Props = $props();

  const uid = $props.id();
  const headingId = `${uid}-heading`;
</script>

<section class="continue-reading col gap-3" aria-labelledby={headingId}>
  <h2 id={headingId} class="text-xs uppercase tracking-wide text-muted">Continue reading</h2>
  <ul class="grid-auto p-0">
    {#each books as book (book.id)}
      {@const progress = bookProgress(book)}
      {@const cover = covers.get(book.id) ?? null}
      <li>
        <Card href="/read/{book.id}" variant="elevated">
          <div class="row items-center gap-4">
            <span class="thumb surface-sunken rounded-control">
              {#if cover !== null}
                <img class="art" src={cover} alt="" />
              {/if}
            </span>
            <span class="col gap-2 flex-1">
              <span class="title text-base weight-semibold truncate" lang={book.language}>
                {book.title}
              </span>
              {#if progress.kind === 'known'}
                <Progress label="Read so far in {book.title}" value={progress.filled} size="sm" />
                <span class="text-xs mono text-muted">{progress.label}</span>
              {/if}
              <span class="text-xs text-faint">Resume</span>
            </span>
          </div>
        </Card>
      </li>
    {/each}
  </ul>
</section>
