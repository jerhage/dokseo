<script lang="ts">
  import { goto } from '$app/navigation';
  import type { BookId, CaptureId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import { readerHref } from '$lib/shared/reader-location';
  import { segmentsOf, textMatches, type TextSegment } from '$lib/shared/text-search';
  import { matchesByBook, type SearchedBook } from '../../domain/capture/capture-results';
  import { clampedIndex, NO_MATCH } from '../../domain/capture/match-stepping';
  import { firstImage, pageLabel } from './capture-place';
  import type { CaptureSearchView } from './capture-search.svelte';

  type Scope = 'book' | 'all';

  type Props = {
    readonly book: BookId;
    readonly books: readonly SearchedBook[];
    readonly covers?: ReadonlyMap<BookId, string>;
    readonly find: CaptureSearchView;
    readonly onopen?: () => void;
  };

  type Row = {
    readonly id: CaptureId;
    readonly href: string;
    readonly page: string;
    readonly title: string | null;
    readonly language: Language;
    readonly cover: string | null;
    readonly segments: readonly TextSegment[];
  };

  const SCOPES: readonly { readonly value: Scope; readonly label: string }[] = [
    { value: 'book', label: 'This book' },
    { value: 'all', label: 'All uploads' },
  ];

  let { book, books, covers = new Map(), find, onopen }: Props = $props();

  let shown = $state(false);
  let query = $state('');
  let scope = $state<Scope>('book');
  let at = $state(NO_MATCH);
  let field = $state<HTMLInputElement | null>(null);
  let list = $state<(HTMLAnchorElement | null)[]>([]);

  const wanted = $derived(books.filter((shelf) => scope === 'all' || shelf.id === book));

  const rows = $derived.by<readonly Row[]>(() => {
    if (!shown || query.trim().length === 0) return [];

    return matchesByBook(find.captures, wanted, query).flatMap((matched) =>
      matched.captures
        .map((capture): Row | null => {
          const index = firstImage(capture.regions);
          if (index === null) return null;

          return {
            id: capture.id,
            href: readerHref(matched.book.id, index, { capture: capture.id, query }),
            page: pageLabel(index),
            title: matched.book.id === book ? null : matched.book.title,
            language: matched.book.language,
            cover: covers.get(matched.book.id) ?? null,
            segments: segmentsOf(capture.text, textMatches(capture.text, query)),
          };
        })
        .filter((row) => row !== null),
    );
  });

  const cursor = $derived(at >= rows.length ? NO_MATCH : at);

  $effect(() => {
    if (shown) field?.focus();
  });

  function reveal(): void {
    shown = true;
    at = NO_MATCH;
    void find.load();
    onopen?.();
  }

  function hide(): void {
    shown = false;
  }

  function moveBy(by: number): void {
    at = clampedIndex(cursor, by, rows.length);
    list[at]?.scrollIntoView({ block: 'nearest' });
  }

  function open(row: Row, newTab: boolean): void {
    if (newTab) {
      window.open(row.href, '_blank', 'noopener');
      return;
    }

    hide();
    void goto(row.href);
  }

  function shortcuts(event: KeyboardEvent): void {
    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (shown) hide();
      else reveal();
      return;
    }

    if (!shown) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveBy(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key !== 'Enter') return;

    const row = rows[cursor === NO_MATCH ? 0 : cursor];
    if (row === undefined) return;

    event.preventDefault();
    open(row, event.metaKey || event.ctrlKey);
  }
</script>

<svelte:window onkeydown={shortcuts} />

{#if shown}
  <div class="scrim">
    <button class="dismiss" type="button" aria-label="Close find in captures" onclick={hide}
    ></button>
    <div class="palette" role="dialog" aria-modal="true" aria-label="Find in captures">
      <div class="bar">
        <span class="lens" aria-hidden="true"></span>
        <label class="assistive" for="capture-palette">Find in captures</label>
        <input
          bind:this={field}
          id="capture-palette"
          type="search"
          bind:value={query}
          placeholder="Find in captures"
          oninput={() => (at = NO_MATCH)}
        />
        <span class="chips">
          {#each SCOPES as choice (choice.value)}
            <button
              class="chip"
              type="button"
              aria-pressed={scope === choice.value}
              onclick={() => {
                scope = choice.value;
                at = NO_MATCH;
              }}
            >
              {choice.label}
            </button>
          {/each}
        </span>
      </div>

      {#if rows.length === 0}
        {#if query.trim().length > 0}
          <p class="nothing">No capture holds that text.</p>
        {/if}
      {:else}
        <ul class="rows">
          {#each rows as row, order (row.id)}
            <li>
              <a
                bind:this={list[order]}
                class="row"
                class:at={order === cursor}
                href={row.href}
                onclick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  open(row, false);
                }}
              >
                <span class="thumb">
                  {#if row.cover !== null}
                    <img src={row.cover} alt="" />
                  {/if}
                </span>
                <span class="body">
                  <span class="text" class:ko={row.language === 'ko'} lang={row.language}>
                    {#each row.segments as segment, part (part)}{#if segment.matched}<mark
                          class="wash">{segment.text}</mark
                        >{:else}{segment.text}{/if}{/each}
                  </span>
                  {#if row.title !== null}
                    <span class="from">{row.title}</span>
                  {/if}
                </span>
                <span class="page">p.{row.page}</span>
              </a>
            </li>
          {/each}
        </ul>
      {/if}

      <div class="foot">
        <span>{rows.length} {rows.length === 1 ? 'capture' : 'captures'}</span>
        <span class="keys">↑↓ move · ↵ jump to page · ⌘↵ new tab · esc close</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    z-index: var(--z-modal);
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 96px var(--s-4) var(--s-4);
    background: rgb(8 9 10 / 62%);
    font-family: var(--f-ui);
  }

  .dismiss {
    position: absolute;
    inset: 0;
    border: 0;
    background: none;
    cursor: default;
  }

  .palette {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 620px;
    max-width: 100%;
    max-height: 70vh;
    overflow: hidden;
    border: 1px solid var(--c-border-6);
    border-radius: var(--r-7);
    background: var(--c-surface-popover);
    box-shadow: 0 30px 70px rgb(0 0 0 / 70%);
  }

  .bar {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--s-3);
    height: 48px;
    padding: 0 var(--s-4);
    border-bottom: 1px solid var(--c-border-2);
  }

  .lens {
    flex: none;
    width: 13px;
    height: 13px;
    border: 2px solid var(--c-accent);
    border-radius: 50%;
  }

  input {
    flex: 1 1 auto;
    min-width: 0;
    border: 0;
    background: none;
    color: var(--c-text-1);
    font-family: var(--f-ui);
    font-size: 14.5px;
  }

  input::placeholder {
    color: var(--c-text-10);
  }

  input:focus-visible {
    outline: none;
  }

  .chips {
    display: flex;
    flex: none;
    gap: var(--s-1);
  }

  .chip {
    padding: 4px var(--s-2);
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-pill);
    background: var(--c-surface-card-quiet);
    color: var(--c-text-6);
    font-family: var(--f-ui);
    font-size: 11px;
    cursor: pointer;
  }

  .chip[aria-pressed='true'] {
    border-color: var(--c-accent-border);
    background: var(--c-accent-wash);
    color: var(--c-accent);
  }

  .rows {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 3px;
    margin: 0;
    padding: var(--s-2);
    overflow-y: auto;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-4);
    color: inherit;
    text-decoration: none;
  }

  .row:hover,
  .row:focus-visible,
  .row.at {
    outline: none;
    background: var(--c-surface-card-active);
  }

  .thumb {
    flex: none;
    width: 28px;
    height: 40px;
    overflow: hidden;
    border: 1px solid var(--c-border-7);
    border-radius: var(--r-1);
    background: var(--c-surface-chip);
  }

  .row.at .thumb {
    border-color: var(--c-accent);
  }

  .thumb img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .body {
    flex: 1 1 auto;
    min-width: 0;
  }

  .text {
    display: block;
    overflow: hidden;
    color: var(--c-text-3);
    font-family: var(--f-ja);
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .text.ko {
    font-family: var(--f-ko);
  }

  .row.at .text {
    color: var(--c-text-1);
  }

  .from {
    display: block;
    margin-top: 3px;
    color: var(--c-text-7);
    font-size: 11px;
  }

  .page {
    flex: none;
    color: var(--c-text-7);
    font-family: var(--f-mono);
    font-size: 10.5px;
  }

  .row.at .page {
    color: var(--c-accent);
  }

  .wash {
    border-radius: var(--r-1);
    background: var(--c-accent-wash-strong);
    color: var(--c-text-1);
  }

  .nothing {
    margin: 0;
    padding: var(--s-5) var(--s-4);
    color: var(--c-text-9);
    font-size: 12px;
  }

  .foot {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--s-3);
    height: 36px;
    padding: 0 var(--s-4);
    border-top: 1px solid var(--c-border-2);
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10.5px;
  }

  .keys {
    margin-left: auto;
  }

  .assistive {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
