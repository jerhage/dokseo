<script lang="ts">
  import { match } from 'ts-pattern';
  import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
  import type { Language } from '$lib/shared/language';
  import { readerHref } from '$lib/shared/reader-location';
  import { tagsHref } from '$lib/shared/tag-location';
  import { clampedIndex, NO_MATCH } from '../../domain/capture/match-stepping';
  import type { Tag } from '../../domain/tag/tag';
  import type { TagSummary } from '../../domain/tag/tag-summary';
  import { capturedLabel, firstImage, pageLabel, placeLabel } from '../capture/capture-place';
  import { chipsOf } from '../capture/tag-chip';
  import type { TagChip } from '../capture/tag-chip';
  import type { TagView } from './tag-view.svelte';

  type Props = {
    readonly view: TagView;
    readonly covers: ReadonlyMap<BookId, string>;
  };

  type Stage =
    | { readonly kind: 'loading' }
    | { readonly kind: 'no-tags' }
    | { readonly kind: 'unchosen' }
    | { readonly kind: 'empty'; readonly tag: Tag; readonly summary: TagSummary }
    | { readonly kind: 'chosen'; readonly tag: Tag; readonly summary: TagSummary };

  type Row = {
    readonly id: CaptureId;
    readonly order: number;
    readonly href: string;
    readonly page: string;
    readonly place: string;
    readonly when: string | null;
    readonly text: string;
    readonly chips: readonly TagChip[];
  };

  type Shelf = {
    readonly id: BookId;
    readonly title: string;
    readonly language: Language;
    readonly cover: string | null;
    readonly rows: readonly Row[];
  };

  type Named = {
    readonly id: TagId;
    readonly name: string;
    readonly colour: string;
    readonly count: number;
  };

  type Walk = { readonly tag: TagId | null; readonly at: number };

  let { view, covers }: Props = $props();

  let walk = $state.raw<Walk | null>(null);
  let anchors = $state<(HTMLAnchorElement | null)[]>([]);

  const stage = $derived.by<Stage>(() => {
    const chosen = view.chosen;
    const tag = chosen === null ? undefined : view.tagsById.get(chosen);
    const summary = view.summary;

    if (tag !== undefined && summary !== null) {
      return summary.captures === 0
        ? { kind: 'empty', tag, summary }
        : { kind: 'chosen', tag, summary };
    }

    if (view.tags.length > 0) return { kind: 'unchosen' };

    return match(view.status)
      .with('idle', 'loading', (): Stage => ({ kind: 'loading' }))
      .with('ready', 'failed', (): Stage => ({ kind: 'no-tags' }))
      .exhaustive();
  });

  const shelves = $derived.by<readonly Shelf[]>(() => {
    let order = 0;

    return view.groups
      .map((group) => ({
        id: group.book.id,
        title: group.book.title,
        language: group.book.language,
        cover: covers.get(group.book.id) ?? null,
        rows: group.captures
          .map((capture): Row | null => {
            const index = firstImage(capture.anchor);
            if (index === null) return null;

            return {
              id: capture.id,
              order: order++,
              href: readerHref(group.book.id, index, { capture: capture.id, query: null }),
              page: pageLabel(index),
              place: placeLabel(capture.anchor),
              when: capturedLabel(capture.createdAt, Date.now()),
              text: capture.text,
              chips: chipsOf(
                capture.tagIds.filter((carried) => carried !== view.chosen),
                view.tags,
              ),
            };
          })
          .filter((row) => row !== null),
      }))
      .filter((shelf) => shelf.rows.length > 0);
  });

  const neighbours = $derived.by<readonly Named[]>(() =>
    view.also.flatMap((other) => {
      const tag = view.tagsById.get(other.id);
      if (tag === undefined) return [];

      return [{ id: tag.id, name: tag.name, colour: tag.colour, count: other.count }];
    }),
  );

  const tally = $derived(shelves.reduce((total, shelf) => total + shelf.rows.length, 0));

  const cursor = $derived(walk !== null && walk.tag === view.chosen ? walk.at : NO_MATCH);

  function countOf(summary: TagSummary): string {
    const captures = `${summary.captures} ${summary.captures === 1 ? 'capture' : 'captures'}`;
    const documents = `${summary.documents} ${summary.documents === 1 ? 'document' : 'documents'}`;

    return `${captures} across ${documents}`;
  }

  function addedLabel(summary: TagSummary): string | null {
    return summary.lastAdded === null ? null : capturedLabel(summary.lastAdded, Date.now());
  }

  function moveBy(by: number): void {
    const at = clampedIndex(cursor, by, tally);
    if (at === NO_MATCH) return;

    walk = { tag: view.chosen, at };
    anchors[at]?.scrollIntoView({ block: 'nearest' });
    anchors[at]?.focus({ preventScroll: true });
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

    const row = anchors[cursor];
    if (row === null || row === undefined) return;

    event.preventDefault();
    if (event.metaKey || event.ctrlKey) window.open(row.href, '_blank', 'noopener');
    else row.click();
  }
</script>

<svelte:window onkeydown={keys} />

<div class="screen">
  <nav class="rail" aria-label="Sections">
    <a class="mark" href="/" aria-label="Your library">
      <span lang="ja" aria-hidden="true">読</span>
    </a>
    <a class="pip current" href={tagsHref(null)} aria-current="page" title="Tags">
      <span aria-hidden="true">#</span>
      <span class="assistive">Tags</span>
    </a>
    <span class="grow"></span>
    <a class="pip" href="/settings" title="OCR engine settings">
      <span aria-hidden="true">⚙</span>
      <span class="assistive">Settings</span>
    </a>
  </nav>

  <aside class="column" aria-label="Tags">
    <header class="top">
      <h2>Tags</h2>
      <span class="total">{view.tags.length}</span>
    </header>
    <label class="assistive" for="tag-filter">Filter tags</label>
    <input
      id="tag-filter"
      class="filter"
      type="search"
      placeholder="Filter tags"
      bind:value={view.filter}
    />
    <ul class="list">
      {#each view.column as option (option.tag.id)}
        <li>
          <a
            class="tag"
            class:at={option.tag.id === view.chosen}
            style="--swatch: var(--c-tag-{option.tag.colour})"
            href={tagsHref(option.tag.name)}
            aria-current={option.tag.id === view.chosen ? 'page' : undefined}
          >
            <span class="name">{option.tag.name}</span>
            <span class="count">{option.count}</span>
          </a>
        </li>
      {/each}
    </ul>
    <a class="manage" href="/tags/manage">Manage tags</a>
  </aside>

  <main class="main">
    {#if view.status === 'failed'}
      <p class="alert" role="alert">Your tags could not be read.</p>
    {/if}

    {#if stage.kind === 'loading'}
      <p class="notice" aria-live="polite">Reading your tags…</p>
    {:else if stage.kind === 'no-tags'}
      <p class="notice">
        No tags yet. Tag a capture from the capture panel in the reader and it appears here.
      </p>
    {:else if stage.kind === 'unchosen'}
      <p class="notice">No tag chosen. Pick one from the list to see everything carrying it.</p>
    {:else}
      {@const added = addedLabel(stage.summary)}
      <header class="head" style="--swatch: var(--c-tag-{stage.tag.colour})">
        <span class="swatch" aria-hidden="true"></span>
        <h1>{stage.tag.name}</h1>
        <p class="summary">
          {countOf(stage.summary)}{#if added !== null}
            <span class="dot" aria-hidden="true">·</span>{added}{/if}
        </p>
      </header>

      {#if stage.kind === 'empty'}
        <p class="notice">
          Nothing carries {stage.tag.name} any more. Tag a capture in the reader to fill this in.
        </p>
      {:else}
        {#if neighbours.length > 0}
          <section class="also" aria-label="Also tagged">
            <p class="caption">Also tagged</p>
            <ul class="chips">
              {#each neighbours as other (other.id)}
                <li>
                  <a
                    class="chip"
                    style="--swatch: var(--c-tag-{other.colour})"
                    href={tagsHref(view.tagsById.get(other.id)?.name ?? null)}
                  >
                    <span class="swatch" aria-hidden="true"></span>
                    <span class="label">{other.name}</span>
                    <span class="count">{other.count}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        <ul class="books">
          {#each shelves as shelf (shelf.id)}
            <li class="book">
              <div class="title">
                <span class="cover">
                  {#if shelf.cover !== null}
                    <img src={shelf.cover} alt="" />
                  {/if}
                </span>
                <h2 class:ko={shelf.language === 'ko'} lang={shelf.language}>{shelf.title}</h2>
                <span class="hits">
                  {shelf.rows.length}
                  {shelf.rows.length === 1 ? 'capture' : 'captures'} tagged
                </span>
                <a class="whole" href="/read/{shelf.id}">Open document</a>
              </div>
              <ul class="rows">
                {#each shelf.rows as row (row.id)}
                  <li>
                    <a
                      bind:this={anchors[row.order]}
                      class="row"
                      class:at={row.order === cursor}
                      href={row.href}
                      onfocus={() => (walk = { tag: view.chosen, at: row.order })}
                    >
                      <span class="page">p.{row.page}</span>
                      <span class="body">
                        <span class="text" class:ko={shelf.language === 'ko'} lang={shelf.language}>
                          {row.text}
                        </span>
                        <span class="meta">
                          <span class="where">{row.place}</span>
                          {#if row.when !== null}
                            <span class="when">{row.when}</span>
                          {/if}
                          {#each row.chips as chip (chip.id)}
                            <span class="carried" style="--swatch: var(--c-tag-{chip.colour})">
                              <span class="swatch" aria-hidden="true"></span>
                              {chip.name}
                            </span>
                          {/each}
                        </span>
                      </span>
                      <span class="jump">Jump to p.{row.page}</span>
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
            <span class="does">jump</span>
            <kbd>⌘↵</kbd>
            <span class="does">new tab</span>
          </span>
        </footer>
      {/if}
    {/if}
  </main>
</div>

<style>
  .screen {
    display: flex;
    height: 100vh;
    background: var(--c-surface-app);
    color: var(--c-text-2);
    font-family: var(--f-ui);
  }

  .rail {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    gap: var(--s-2);
    width: 62px;
    padding: var(--s-4) 0;
    border-right: 1px solid var(--c-border-1);
    background: var(--c-surface-rail);
  }

  .grow {
    flex: 1 1 auto;
  }

  .mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: var(--r-4);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-family: var(--f-ja);
    font-size: 15px;
    text-decoration: none;
  }

  .pip {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-4);
    color: var(--c-text-7);
    font-size: 14px;
    text-decoration: none;
  }

  .pip:hover,
  .pip:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .pip.current {
    border-color: var(--c-accent-border);
    background: var(--c-accent-wash-faint);
    color: var(--c-accent);
  }

  .column {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--s-2);
    width: 216px;
    min-height: 0;
    padding: var(--s-4) var(--s-3);
    border-right: 1px solid var(--c-border-1);
    background: var(--c-surface-rail);
  }

  .top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0 var(--s-2);
  }

  .top h2 {
    margin: 0;
    color: var(--c-text-10);
    font-family: var(--f-mono);
    font-size: 9.5px;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .total {
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10px;
  }

  .filter {
    flex: none;
    height: 28px;
    padding: 0 var(--s-2);
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-3);
    background: var(--c-surface-popover);
    color: var(--c-text-2);
    font-family: var(--f-ui);
    font-size: 12px;
  }

  .filter::placeholder {
    color: var(--c-text-placeholder);
  }

  .filter:focus-visible {
    border-color: var(--c-accent-line);
    outline: none;
  }

  .list {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 1px;
    min-height: 0;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  .tag {
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
    padding: var(--s-2);
    border-left: 2px solid transparent;
    border-radius: 0 var(--r-3) var(--r-3) 0;
    color: var(--c-text-6);
    font-size: 12.5px;
    text-decoration: none;
  }

  .tag:hover,
  .tag:focus-visible {
    background: var(--c-surface-card-quiet);
    color: var(--c-text-3);
    outline: none;
  }

  .tag.at {
    border-left-color: var(--swatch);
    background: var(--c-surface-card-active);
    color: var(--c-text-1);
  }

  .name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .count {
    flex: none;
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10px;
  }

  .manage {
    flex: none;
    padding: var(--s-2);
    border-top: 1px solid var(--c-border-1);
    color: var(--c-text-8);
    font-size: 11.5px;
    text-decoration: none;
  }

  .manage:hover,
  .manage:focus-visible {
    color: var(--c-text-3);
    outline: none;
  }

  .main {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: var(--s-4);
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    padding: var(--s-5) var(--s-6);
  }

  .alert {
    margin: 0;
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-warning-border);
    border-radius: var(--r-4);
    background: var(--c-warning-wash-faint);
    color: var(--c-warning-text-soft);
    font-size: 12px;
  }

  .notice {
    max-width: 52ch;
    margin: 0;
    color: var(--c-text-8);
    font-size: 12.5px;
    line-height: 1.5;
  }

  .head {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2);
  }

  .swatch {
    flex: none;
    width: 9px;
    height: 9px;
    border-radius: 2px;
    background: var(--swatch);
  }

  .head h1 {
    margin: 0;
    color: var(--c-text-1);
    font-size: 19px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  .summary {
    flex: 1 1 100%;
    margin: 0;
    color: var(--c-text-8);
    font-size: 11.5px;
  }

  .dot {
    padding: 0 var(--s-1);
  }

  .also {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--s-2);
  }

  .caption {
    margin: 0;
    color: var(--c-text-10);
    font-family: var(--f-mono);
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border: 1px solid var(--c-border-8);
    border-radius: var(--r-8);
    background: var(--c-surface-tag);
    color: var(--c-text-tag);
    font-size: 11px;
    line-height: 1;
    text-decoration: none;
  }

  .chip:hover,
  .chip:focus-visible {
    border-color: var(--c-border-9);
    color: var(--c-text-1);
    outline: none;
  }

  .books,
  .rows {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .books {
    gap: var(--s-5);
  }

  .book {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }

  .title {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    padding-bottom: var(--s-2);
    border-bottom: 1px solid var(--c-border-1);
  }

  .cover {
    flex: none;
    width: 26px;
    height: 36px;
    overflow: hidden;
    border: 1px solid var(--c-border-7);
    border-radius: var(--r-1);
    background: var(--c-surface-chip);
  }

  .cover img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .title h2 {
    margin: 0;
    overflow: hidden;
    color: var(--c-text-3);
    font-family: var(--f-ja);
    font-size: 13px;
    font-weight: 400;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title h2.ko {
    font-family: var(--f-ko);
  }

  .hits {
    flex: 1 1 auto;
    color: var(--c-text-9);
    font-size: 11px;
  }

  .whole {
    flex: none;
    color: var(--c-text-7);
    font-size: 11.5px;
    text-decoration: none;
  }

  .whole:hover,
  .whole:focus-visible {
    color: var(--c-accent);
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
    border-color: var(--c-accent-line);
    outline: none;
    background: var(--c-surface-card-active);
  }

  .page {
    flex: none;
    padding-top: 2px;
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10px;
  }

  .row.at .page,
  .row:hover .page {
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
    font-size: 16px;
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
    align-items: center;
    gap: var(--s-1) var(--s-2);
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10px;
  }

  .where {
    color: var(--c-text-7);
  }

  .carried {
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

  .jump {
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

  .row:hover .jump,
  .row:focus-visible .jump,
  .row.at .jump {
    opacity: 1;
  }

  .foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-4);
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

  .assistive {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (max-width: 860px) {
    .column {
      width: 176px;
    }

    .jump {
      display: none;
    }
  }
</style>
