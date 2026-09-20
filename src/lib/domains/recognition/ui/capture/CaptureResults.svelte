<script lang="ts">
  import type { BookId, CaptureId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import { readerHref } from '$lib/shared/reader-location';
  import { segmentsOf, textMatches, type TextSegment } from '$lib/shared/text-search';
  import type { Capture } from '../../domain/capture/capture';
  import { matchesByBook, type SearchedBook } from '../../domain/capture/capture-results';
  import { clampedIndex, NO_MATCH } from '../../domain/capture/match-stepping';
  import { capturedLabel, firstImage, pageLabel, placeLabel } from './capture-place';

  type Props = {
    readonly captures: readonly Capture[];
    readonly books: readonly SearchedBook[];
    readonly covers?: ReadonlyMap<BookId, string>;
    readonly query: string;
  };

  type Row = {
    readonly id: CaptureId;
    readonly order: number;
    readonly href: string;
    readonly page: string;
    readonly place: string;
    readonly when: string | null;
    readonly cover: string | null;
    readonly segments: readonly TextSegment[];
  };

  type Shelf = {
    readonly id: string;
    readonly title: string;
    readonly language: Language;
    readonly rows: readonly Row[];
  };

  type Walk = { readonly query: string; readonly at: number };

  let { captures, books, covers = new Map(), query }: Props = $props();

  let walk = $state.raw<Walk | null>(null);
  let rows = $state<(HTMLAnchorElement | null)[]>([]);

  const shelves = $derived.by<readonly Shelf[]>(() => {
    let order = 0;

    return matchesByBook(captures, books, query)
      .map((matched) => ({
        id: matched.book.id,
        title: matched.book.title,
        language: matched.book.language,
        rows: matched.captures
          .map((capture): Row | null => {
            const index = firstImage(capture.regions);
            if (index === null) return null;

            return {
              id: capture.id,
              order: order++,
              href: readerHref(matched.book.id, index, { capture: capture.id, query }),
              page: pageLabel(index),
              place: placeLabel(capture.regions),
              when: capturedLabel(capture.createdAt, Date.now()),
              cover: covers.get(matched.book.id) ?? null,
              segments: segmentsOf(capture.text, textMatches(capture.text, query)),
            };
          })
          .filter((row) => row !== null),
      }))
      .filter((shelf) => shelf.rows.length > 0);
  });

  const tally = $derived(shelves.reduce((total, shelf) => total + shelf.rows.length, 0));

  const cursor = $derived(walk !== null && walk.query === query ? walk.at : NO_MATCH);

  function moveBy(by: number): void {
    const at = clampedIndex(cursor, by, tally);
    if (at === NO_MATCH) return;

    walk = { query, at };
    rows[at]?.scrollIntoView({ block: 'nearest' });
    rows[at]?.focus({ preventScroll: true });
  }

  function typing(target: EventTarget | null): boolean {
    return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  }

  function keys(event: KeyboardEvent): void {
    if (event.defaultPrevented || tally === 0 || typing(event.target)) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      moveBy(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key !== 'Enter' || cursor === NO_MATCH) return;

    const row = rows[cursor];
    if (row === null || row === undefined) return;

    event.preventDefault();
    if (event.metaKey || event.ctrlKey) window.open(row.href, '_blank', 'noopener');
    else row.click();
  }
</script>

<svelte:window onkeydown={keys} />

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
          <h3 class="title" class:ko={shelf.language === 'ko'} lang={shelf.language}>
            {shelf.title}
            <span class="hits">
              {shelf.rows.length}
              {shelf.rows.length === 1 ? 'match' : 'matches'}
            </span>
          </h3>
          <ul class="list">
            {#each shelf.rows as row (row.id)}
              <li>
                <a
                  bind:this={rows[row.order]}
                  class="row"
                  class:at={row.order === cursor}
                  href={row.href}
                  onfocus={() => (walk = { query, at: row.order })}
                >
                  <span class="thumb">
                    {#if row.cover !== null}
                      <img src={row.cover} alt="" />
                    {/if}
                    <span class="stamp">{row.page}</span>
                  </span>
                  <span class="body">
                    <span class="text" class:ko={shelf.language === 'ko'} lang={shelf.language}>
                      {#each row.segments as segment, part (part)}{#if segment.matched}<mark
                            class="wash">{segment.text}</mark
                          >{:else}{segment.text}{/if}{/each}
                    </span>
                    <span class="meta">
                      <span class="where">{row.place}</span>
                      {#if row.when !== null}
                        <span class="when">{row.when}</span>
                      {/if}
                    </span>
                  </span>
                  <span class="open">Open p.{row.page}</span>
                </a>
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>

    <footer class="foot">
      <span class="keys">
        <kbd>↑↓</kbd>
        <span class="does">move</span>
        <kbd>↵</kbd>
        <span class="does">open</span>
        <kbd>⌘↵</kbd>
        <span class="does">new tab</span>
      </span>
      <span class="only">
        Text only — no page images are stored with a capture, just its page and rectangle.
      </span>
    </footer>
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
  .list {
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
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
    margin: var(--s-2) 0 0;
    color: var(--c-text-4);
    font-family: var(--f-ja);
    font-size: 12.5px;
    font-weight: 400;
  }

  .title.ko {
    font-family: var(--f-ko);
  }

  .hits {
    color: var(--c-text-9);
    font-family: var(--f-ui);
    font-size: 11px;
  }

  .row {
    display: flex;
    gap: var(--s-3);
    padding: var(--s-3);
    border: 1px solid var(--c-border-2);
    border-radius: var(--r-5);
    background: var(--c-surface-card-quiet);
    color: inherit;
    text-decoration: none;
  }

  .row:hover,
  .row:focus-visible,
  .row.at {
    transform: translateY(-1px);
    border-color: var(--c-accent-line);
    outline: none;
    background: var(--c-surface-card-active);
  }

  .thumb {
    position: relative;
    flex: none;
    width: 54px;
    height: 76px;
    overflow: hidden;
    border: 1px solid var(--c-border-7);
    border-radius: var(--r-2);
    background: var(--c-surface-chip);
  }

  .row:hover .thumb,
  .row:focus-visible .thumb,
  .row.at .thumb {
    border-color: var(--c-accent);
  }

  .thumb img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .stamp {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    padding: 2px 0;
    background: rgb(12 13 15 / 86%);
    color: var(--c-text-6);
    font-family: var(--f-mono);
    font-size: 9px;
    text-align: center;
  }

  .row.at .stamp,
  .row:hover .stamp {
    color: var(--c-accent);
  }

  .body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: var(--s-1);
    min-width: 0;
  }

  .text {
    color: var(--c-text-3);
    font-family: var(--f-ja);
    font-size: 17px;
    line-height: 1.45;
  }

  .text.ko {
    font-family: var(--f-ko);
  }

  .row.at .text,
  .row:hover .text {
    color: var(--c-text-1);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10px;
  }

  .where {
    color: var(--c-text-7);
  }

  .row.at .where {
    color: var(--c-accent);
  }

  .open {
    flex: none;
    align-self: center;
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-2);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
    opacity: 0;
  }

  .row:hover .open,
  .row:focus-visible .open,
  .row.at .open {
    opacity: 1;
  }

  .wash {
    border-radius: var(--r-1);
    background: var(--c-accent-wash-strong);
    color: var(--c-text-1);
  }

  .foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-4);
    margin-top: var(--s-2);
    padding-top: var(--s-3);
    border-top: 1px solid var(--c-border-1);
  }

  .keys {
    display: flex;
    align-items: center;
    gap: var(--s-1);
  }

  kbd {
    padding: 2px var(--s-1);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-1);
    background: var(--c-surface-chip);
    color: var(--c-text-7);
    font-family: var(--f-mono);
    font-size: 10px;
  }

  .does {
    margin-right: var(--s-2);
    color: var(--c-text-9);
    font-size: 11px;
  }

  .only {
    margin-left: auto;
    color: var(--c-text-8);
    font-size: 11.5px;
  }

  @media (max-width: 700px) {
    .open {
      display: none;
    }
  }
</style>
