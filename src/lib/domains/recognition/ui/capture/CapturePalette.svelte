<script lang="ts">
  import { match } from 'ts-pattern';
  import { goto } from '$app/navigation';
  import Divider from '$lib/components/Divider.svelte';
  import Input from '$lib/components/Input.svelte';
  import TagToggle from '$lib/components/TagToggle.svelte';
  import { showsScrollbar } from '$lib/components/scrollbar';
  import type { BookId } from '$lib/shared/ids';
  import type { Capture } from '../../domain/capture/capture';
  import type { SearchedBook } from '../../domain/capture/capture-results';
  import { clampedIndex, NO_MATCH } from '../../domain/capture/match-stepping';
  import { quickFinds } from '../../domain/capture/quick-find';
  import type { PaletteFilter, QuickFinds } from '../../domain/capture/quick-find';
  import type { Tag } from '../../domain/tag/tag';
  import type { CaptureSearchView } from './capture-search.svelte';
  import { PALETTE_KEYS, paletteInvite, paletteNothing, resultCount } from './palette-copy';
  import { paletteKey } from './palette-keys';
  import { effectiveScope, paletteRows, searchedBooks } from './palette-rows';
  import type { PaletteRow, PaletteScope } from './palette-rows';
  import PaletteResult from './PaletteResult.svelte';
  import './capture-palette.css';

  type Props = {
    readonly book: BookId | null;
    readonly books: readonly SearchedBook[];
    readonly covers?: ReadonlyMap<BookId, string>;
    readonly counts?: ReadonlyMap<BookId, number>;
    readonly tags?: readonly Tag[];
    readonly find: CaptureSearchView;
    readonly onopen?: () => void;
  };

  const SCOPES: readonly { readonly value: PaletteScope; readonly label: string }[] = [
    { value: 'book', label: 'This book' },
    { value: 'all', label: 'All uploads' },
  ];

  const NOTHING: QuickFinds<Capture> = { books: [], captures: [] };

  let {
    book,
    books,
    covers = new Map(),
    counts = new Map(),
    tags = [],
    find,
    onopen,
  }: Props = $props();

  const uid = $props.id();
  let dialog = $state<HTMLDialogElement>();
  let field = $state<HTMLInputElement>();
  let shown = $state(false);
  let query = $state('');
  let scope = $state<PaletteScope>('book');
  let filter = $state<PaletteFilter>('everything');
  let at = $state(NO_MATCH);
  let list = $state<(HTMLAnchorElement | undefined)[]>([]);
  let pressedBackdrop = false;

  const scoped = $derived(effectiveScope(book, scope));

  const found = $derived(
    shown && query.trim().length > 0
      ? quickFinds(find.captures, searchedBooks(books, book, scoped), tags, query, filter)
      : NOTHING,
  );

  const results = $derived(
    paletteRows({ found, scope: scoped, book, covers, counts, tags, query }),
  );

  const cursor = $derived(at >= results.rows.length ? NO_MATCH : at);

  $effect(() => {
    if (dialog === undefined) return;

    if (shown && !dialog.open) {
      dialog.toggleAttribute(
        'data-page-scrollbar',
        showsScrollbar(window, document.documentElement),
      );
      dialog.showModal();
      field?.focus();
    }

    if (!shown && dialog.open) dialog.close();
  });

  function choose(chosen: PaletteScope): void {
    scope = chosen;
    at = NO_MATCH;
  }

  function reveal(chosen: PaletteScope): void {
    shown = true;
    choose(chosen);
    void find.load();
    onopen?.();
  }

  function hide(): void {
    shown = false;
  }

  function moveBy(by: number): void {
    at = clampedIndex(cursor, by, results.rows.length);
    list[at]?.scrollIntoView({ block: 'nearest' });
  }

  function open(row: PaletteRow, newTab: boolean): void {
    if (newTab) {
      window.open(row.href, '_blank', 'noopener');
      return;
    }

    hide();
    void goto(row.href);
  }

  function openAtCursor(event: KeyboardEvent, newTab: boolean): void {
    const row = results.rows[cursor === NO_MATCH ? 0 : cursor];
    if (row === undefined) return;

    event.preventDefault();
    open(row, newTab);
  }

  function shortcuts(event: KeyboardEvent): void {
    const pressed = paletteKey(event, { shown, scope, hasBook: book !== null });

    match(pressed)
      .with({ kind: 'ignore' }, () => {})
      .with({ kind: 'open' }, ({ newTab }) => openAtCursor(event, newTab))
      .with({ kind: 'reveal' }, ({ scope: chosen }) => {
        event.preventDefault();
        reveal(chosen);
      })
      .with({ kind: 'choose' }, ({ scope: chosen }) => {
        event.preventDefault();
        choose(chosen);
      })
      .with({ kind: 'hide' }, () => {
        event.preventDefault();
        hide();
      })
      .with({ kind: 'move' }, ({ by }) => {
        event.preventDefault();
        moveBy(by);
      })
      .exhaustive();
  }

  function toggleTags(event: MouseEvent): void {
    event.preventDefault();
    filter = filter === 'tags' ? 'everything' : 'tags';
    at = NO_MATCH;
  }

  function pickScope(event: MouseEvent, chosen: PaletteScope): void {
    event.preventDefault();
    choose(chosen);
  }

  function cancel(event: Event): void {
    event.preventDefault();
    hide();
  }

  function pointerdown(event: PointerEvent): void {
    pressedBackdrop = event.target === dialog;
  }

  function click(event: MouseEvent): void {
    if (pressedBackdrop && event.target === dialog) hide();
    pressedBackdrop = false;
  }
</script>

<svelte:window onkeydown={shortcuts} />

<dialog
  bind:this={dialog}
  class="modal-backdrop capture-palette"
  aria-label="Find in captures"
  oncancel={cancel}
  onclose={hide}
  onpointerdown={pointerdown}
  onclick={click}
>
  {#if shown}
    <div class="modal modal-lg">
      <div class="row wrap items-center gap-2 p-3">
        <label class="visually-hidden" for="{uid}-query">Find in captures</label>
        <Input
          bind:ref={field}
          bind:value={query}
          id="{uid}-query"
          class="flex-fill"
          type="search"
          placeholder={paletteInvite(filter, scoped)}
          oninput={() => (at = NO_MATCH)}
        />
        <span class="row items-center gap-1">
          {#if book !== null}
            {#each SCOPES as choice (choice.value)}
              <TagToggle
                pressed={scope === choice.value}
                onclick={(event) => pickScope(event, choice.value)}
              >
                {choice.label}
              </TagToggle>
            {/each}
            <Divider vertical />
          {/if}
          <TagToggle pressed={filter === 'tags'} onclick={toggleTags}>Tags</TagToggle>
        </span>
      </div>

      {#if results.rows.length === 0}
        {#if query.trim().length > 0}
          <p class="px-5 py-5 text-sm text-muted">{paletteNothing(filter, scoped)}</p>
        {/if}
      {:else}
        <div class="col gap-3 p-2 flex-1 min-h-0 overflow-y-auto">
          {#each results.sections as group (group.label)}
            <div class="col gap-1">
              <Divider>{group.label}</Divider>
              <ul class="col gap-1" aria-label={group.label}>
                {#each group.rows as row, order (row.key)}
                  {@const place = group.from + order}
                  <li>
                    <PaletteResult
                      bind:ref={list[place]}
                      {row}
                      current={place === cursor}
                      onopen={(chosen) => open(chosen, false)}
                    />
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>
      {/if}

      <div class="modal-footer row wrap justify-between gap-2 px-4 py-2 mono text-xs text-faint">
        <span>{resultCount(results.rows.length)}</span>
        <span>{PALETTE_KEYS}</span>
      </div>
    </div>
  {/if}
</dialog>
