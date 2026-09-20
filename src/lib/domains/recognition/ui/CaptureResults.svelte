<script lang="ts">
  import type { CaptureId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import { readerHref } from '$lib/shared/reader-location';
  import { segmentsOf, textMatches, type TextSegment } from '$lib/shared/text-search';
  import type { Capture } from '../domain/capture';
  import { matchesByBook, type SearchedBook } from '../domain/capture-results';
  import { firstImage, placeLabel } from './capture-place';

  type Props = {
    readonly captures: readonly Capture[];
    readonly books: readonly SearchedBook[];
    readonly query: string;
  };

  type Row = {
    readonly id: CaptureId;
    readonly href: string;
    readonly place: string;
    readonly segments: readonly TextSegment[];
  };

  type Shelf = {
    readonly id: string;
    readonly title: string;
    readonly language: Language;
    readonly rows: readonly Row[];
  };

  let { captures, books, query }: Props = $props();

  function rowOf(book: SearchedBook, capture: Capture): Row | null {
    const index = firstImage(capture.regions);
    if (index === null) return null;

    return {
      id: capture.id,
      href: readerHref(book.id, index),
      place: placeLabel(capture.regions),
      segments: segmentsOf(capture.text, textMatches(capture.text, query)),
    };
  }

  const shelves = $derived.by<readonly Shelf[]>(() =>
    matchesByBook(captures, books, query)
      .map((matched) => ({
        id: matched.book.id,
        title: matched.book.title,
        language: matched.book.language,
        rows: matched.captures
          .map((capture) => rowOf(matched.book, capture))
          .filter((row) => row !== null),
      }))
      .filter((shelf) => shelf.rows.length > 0),
  );

  const tally = $derived(shelves.reduce((total, shelf) => total + shelf.rows.length, 0));
</script>

<section class="found" aria-label="Recognized text">
  <header class="head">
    <h2>Recognized text</h2>
    <span class="tally">{tally} in {shelves.length} {shelves.length === 1 ? 'book' : 'books'}</span>
  </header>

  {#if tally === 0}
    <p class="nothing">Nothing in your library holds that text.</p>
  {:else}
    <ul class="books">
      {#each shelves as shelf (shelf.id)}
        <li class="book">
          <h3 class="title">{shelf.title}</h3>
          <ul class="hits">
            {#each shelf.rows as row (row.id)}
              <li class="hit">
                <a class="row" href={row.href}>
                  <span class="place">{row.place}</span>
                  <span class="text" class:ko={shelf.language === 'ko'} lang={shelf.language}>
                    {#each row.segments as segment, part (part)}{#if segment.matched}<mark
                          class="wash">{segment.text}</mark
                        >{:else}{segment.text}{/if}{/each}
                  </span>
                </a>
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .found {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    font-family: var(--f-ui);
  }

  .head {
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
  }

  .head h2 {
    margin: 0;
    color: var(--c-text-3);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .tally {
    color: var(--c-text-8);
    font-family: var(--f-mono);
    font-size: 11px;
  }

  .nothing {
    margin: 0;
    color: var(--c-text-9);
    font-size: 12px;
  }

  .books,
  .hits {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .book {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }

  .title {
    margin: 0;
    color: var(--c-text-5);
    font-size: 12px;
    font-weight: 600;
  }

  .row {
    display: flex;
    align-items: baseline;
    gap: var(--s-3);
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-4);
    background: var(--c-surface-card-quiet);
    color: inherit;
    text-decoration: none;
  }

  a.row:hover,
  a.row:focus-visible {
    border-color: var(--c-accent-border);
    outline: none;
  }

  .place {
    flex: none;
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10.5px;
  }

  .text {
    min-width: 0;
    color: var(--c-text-1);
    font-family: var(--f-ja);
    font-size: 15px;
    line-height: 1.6;
  }

  .text.ko {
    font-family: var(--f-ko);
  }

  .wash {
    border-radius: var(--r-1);
    background: var(--c-accent-wash-strong);
    color: var(--c-text-1);
  }
</style>
