<script lang="ts">
  import { goto } from '$app/navigation';
  import type { BookId, CaptureId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import { readerHref } from '$lib/shared/reader-location';
  import { segmentsOf, textMatches } from '$lib/shared/text-search';
  import type { TextSegment } from '$lib/shared/text-search';
  import type { Capture } from '../../domain/capture/capture';
  import type { SearchedBook } from '../../domain/capture/capture-results';
  import { clampedIndex, NO_MATCH } from '../../domain/capture/match-stepping';
  import { matchedTagIds, quickFinds } from '../../domain/capture/quick-find';
  import type { PaletteFilter, QuickFinds } from '../../domain/capture/quick-find';
  import type { Tag } from '../../domain/tag/tag';
  import { markedLines } from './capture-lines';
  import { firstImage, NO_PLACE, pageLabel } from './capture-place';
  import type { CaptureSearchView } from './capture-search.svelte';
  import { chipsOf } from './tag-chip';
  import type { TagChip } from './tag-chip';

  type Scope = 'book' | 'all';

  type Props = {
    readonly book: BookId | null;
    readonly books: readonly SearchedBook[];
    readonly covers?: ReadonlyMap<BookId, string>;
    readonly counts?: ReadonlyMap<BookId, number>;
    readonly tags?: readonly Tag[];
    readonly find: CaptureSearchView;
    readonly onopen?: () => void;
  };

  type RowChip = TagChip & { readonly matched: boolean };

  type BookRow = {
    readonly kind: 'book';
    readonly key: string;
    readonly href: string;
    readonly language: Language;
    readonly cover: string | null;
    readonly segments: readonly TextSegment[];
    readonly images: number | null;
  };

  type CaptureRow = {
    readonly kind: 'capture';
    readonly key: CaptureId;
    readonly href: string;
    readonly place: string;
    readonly title: string | null;
    readonly language: Language;
    readonly cover: string | null;
    readonly segments: readonly TextSegment[];
    readonly note: readonly TextSegment[] | null;
    readonly chips: readonly RowChip[];
  };

  type Row = BookRow | CaptureRow;

  type Section = {
    readonly label: string;
    readonly from: number;
    readonly rows: readonly Row[];
  };

  const SCOPES: readonly { readonly value: Scope; readonly label: string }[] = [
    { value: 'book', label: 'This book' },
    { value: 'all', label: 'All uploads' },
  ];

  const NOTHING: QuickFinds<Capture> = { books: [], captures: [] };

  function bookHref(id: BookId): string {
    return `/read/${encodeURIComponent(id)}`;
  }

  let {
    book,
    books,
    covers = new Map(),
    counts = new Map(),
    tags = [],
    find,
    onopen,
  }: Props = $props();

  let shown = $state(false);
  let query = $state('');
  let scope = $state<Scope>('book');
  let filter = $state<PaletteFilter>('everything');
  let at = $state(NO_MATCH);
  let field = $state<HTMLInputElement | null>(null);
  let list = $state<(HTMLAnchorElement | null)[]>([]);

  const scoped = $derived<Scope>(book === null ? 'all' : scope);

  const wanted = $derived(books.filter((shelf) => scoped === 'all' || shelf.id === book));

  const found = $derived(
    shown && query.trim().length > 0
      ? quickFinds(find.captures, wanted, tags, query, filter)
      : NOTHING,
  );

  const titled = $derived(scoped === 'book' ? [] : found.books);

  const bookRows = $derived.by<readonly BookRow[]>(() =>
    titled.map((shelf) => ({
      kind: 'book',
      key: shelf.id,
      href: bookHref(shelf.id),
      language: shelf.language,
      cover: covers.get(shelf.id) ?? null,
      segments: segmentsOf(shelf.title, textMatches(shelf.title, query)),
      images: counts.get(shelf.id) ?? null,
    })),
  );

  const captureRows = $derived.by<readonly CaptureRow[]>(() =>
    found.captures.flatMap((matched) =>
      matched.captures.map((capture): CaptureRow => {
        const index = firstImage(capture.anchor);
        const lit = new Set(matchedTagIds(capture, tags, query));
        const lines = markedLines(capture, query);

        return {
          kind: 'capture',
          key: capture.id,
          href:
            index === null
              ? bookHref(matched.book.id)
              : readerHref(matched.book.id, index, { capture: capture.id, query }),
          place: index === null ? NO_PLACE : `p.${pageLabel(index)}`,
          title: matched.book.id === book ? null : matched.book.title,
          language: matched.book.language,
          cover: covers.get(matched.book.id) ?? null,
          segments: lines.text,
          note: lines.note,
          chips: chipsOf(capture.tagIds, tags).map((chip) => ({
            id: chip.id,
            name: chip.name,
            colour: chip.colour,
            matched: lit.has(chip.id),
          })),
        };
      }),
    ),
  );

  const rows = $derived.by<readonly Row[]>(() => [...bookRows, ...captureRows]);

  const sections = $derived.by<readonly Section[]>(() =>
    [
      { label: 'Books', from: 0, rows: bookRows },
      { label: 'Captures', from: bookRows.length, rows: captureRows },
    ].filter((group) => group.rows.length > 0),
  );

  const cursor = $derived(at >= rows.length ? NO_MATCH : at);

  const titling = $derived(filter !== 'tags' && scoped === 'all');

  const invite = $derived.by(() => {
    if (filter === 'tags') return 'Find a tag';

    return titling ? 'Find in titles, text, tags and notes' : 'Find in text, tags and notes';
  });

  const nothing = $derived.by(() => {
    if (filter === 'tags') return 'No capture carries a tag of that name.';

    return titling ? 'No title or capture holds that text.' : 'No capture holds that text.';
  });

  $effect(() => {
    if (shown) field?.focus();
  });

  function choose(chosen: Scope): void {
    scope = chosen;
    at = NO_MATCH;
  }

  function reveal(chosen: Scope): void {
    shown = true;
    choose(chosen);
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
    if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      const chosen: Scope = book === null || event.shiftKey ? 'all' : 'book';
      if (!shown) reveal(chosen);
      else if (scope === chosen) hide();
      else choose(chosen);
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
          placeholder={invite}
          oninput={() => (at = NO_MATCH)}
        />
        <span class="chips">
          {#if book !== null}
            {#each SCOPES as choice (choice.value)}
              <button
                class="chip"
                type="button"
                aria-pressed={scope === choice.value}
                onclick={() => choose(choice.value)}
              >
                {choice.label}
              </button>
            {/each}
            <span class="divider" aria-hidden="true"></span>
          {/if}
          <button
            class="chip"
            type="button"
            aria-pressed={filter === 'tags'}
            onclick={() => {
              filter = filter === 'tags' ? 'everything' : 'tags';
              at = NO_MATCH;
            }}
          >
            Tags
          </button>
        </span>
      </div>

      {#if rows.length === 0}
        {#if query.trim().length > 0}
          <p class="nothing">{nothing}</p>
        {/if}
      {:else}
        <div class="found">
          {#each sections as group (group.label)}
            <div class="group">
              <p class="caption">
                {group.label}<span class="rule" aria-hidden="true"></span>
              </p>
              <ul class="rows">
                {#each group.rows as row, order (row.key)}
                  {@const place = group.from + order}
                  <li>
                    <a
                      bind:this={list[place]}
                      class="row"
                      class:at={place === cursor}
                      href={row.href}
                      onclick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                          return;
                        }
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
                        {#if row.kind === 'book'}
                          {#if row.images !== null}
                            <span class="from">{row.images} images</span>
                          {/if}
                        {:else}
                          {#if row.note !== null}
                            <span class="note"
                              >{#each row.note as segment, part (part)}{#if segment.matched}<mark
                                    class="wash">{segment.text}</mark
                                  >{:else}{segment.text}{/if}{/each}</span
                            >
                          {/if}
                          {#if row.title !== null}
                            <span class="from">{row.title}</span>
                          {/if}
                          {#if row.chips.length > 0}
                            <span class="tags">
                              {#each row.chips as chip (chip.id)}
                                <span
                                  class="tag"
                                  class:lit={chip.matched}
                                  style="--swatch: var(--c-tag-{chip.colour})"
                                >
                                  <span class="swatch" aria-hidden="true"></span>
                                  {chip.name}
                                </span>
                              {/each}
                            </span>
                          {/if}
                        {/if}
                      </span>
                      {#if row.kind === 'capture'}
                        <span class="page">{row.place}</span>
                      {/if}
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>
      {/if}

      <div class="foot">
        <span>{rows.length} {rows.length === 1 ? 'result' : 'results'}</span>
        <span class="keys">↑↓ move · ↵ jump to result · ⌘↵ new tab · esc close</span>
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

  .divider {
    flex: none;
    align-self: stretch;
    width: 1px;
    margin: var(--s-2) 3px;
    background: var(--c-border-4);
  }

  .found {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: var(--s-3);
    padding: var(--s-2);
    overflow-y: auto;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .caption {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    margin: 0;
    padding: 0 var(--s-3) var(--s-1);
    color: var(--c-text-10);
    font-family: var(--f-mono);
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .rule {
    flex: 1 1 auto;
    height: 1px;
    background: var(--c-border-2);
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 0;
    padding: 0;
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

  .note {
    display: block;
    margin-top: 4px;
    padding-left: 6px;
    overflow: hidden;
    border-left: 3px solid var(--c-note);
    color: var(--c-text-6);
    font-family: var(--f-ui);
    font-size: 11.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .from {
    display: block;
    margin-top: 3px;
    color: var(--c-text-7);
    font-size: 11px;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-1);
    margin-top: 5px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border: 1px solid var(--c-border-8);
    border-radius: var(--r-8);
    background: var(--c-surface-tag);
    color: var(--c-text-tag);
    font-family: var(--f-ui);
    font-size: 10.5px;
    line-height: 1;
  }

  .tag.lit {
    border-color: var(--c-text-tag);
    color: var(--c-text-1);
    font-weight: 600;
  }

  .swatch {
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: 1px;
    background: var(--swatch);
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
