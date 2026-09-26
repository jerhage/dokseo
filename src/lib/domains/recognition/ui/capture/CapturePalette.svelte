<script lang="ts">
  import { match } from 'ts-pattern';
  import { goto } from '$app/navigation';
  import Divider from '$lib/components/Divider.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import TagToggle from '$lib/components/TagToggle.svelte';
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
  let shown = $state(false);
  let present = $state(false);
  let query = $state('');
  let scope = $state<PaletteScope>('book');
  let filter = $state<PaletteFilter>('everything');
  let at = $state(NO_MATCH);
  let list = $state<(HTMLElement | undefined)[]>([]);

  const scoped = $derived(effectiveScope(book, scope));

  const found = $derived(
    present && query.trim().length > 0
      ? quickFinds(find.captures, searchedBooks(books, book, scoped), tags, query, filter)
      : NOTHING,
  );

  const results = $derived(
    paletteRows({ found, scope: scoped, book, covers, counts, tags, query }),
  );

  const cursor = $derived(at >= results.rows.length ? NO_MATCH : at);

  function choose(chosen: PaletteScope): void {
    scope = chosen;
    at = NO_MATCH;
  }

  function reveal(chosen: PaletteScope): void {
    shown = true;
    present = true;
    choose(chosen);
    void find.load();
    onopen?.();
  }

  export function searchEverything(): void {
    reveal('all');
  }

  function hide(): void {
    shown = false;
  }

  function gone(): void {
    present = false;
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
</script>

<svelte:window onkeydown={shortcuts} />

<Modal
  bind:open={shown}
  aria-label="Find in captures"
  size="lg"
  placement="top"
  body="flush"
  footerVariant="info"
  onclose={gone}
>
  {#snippet header()}
    <div class="modal-header wrap items-center gap-2 p-3">
      <label class="visually-hidden" for="{uid}-query">Find in captures</label>
      <Input
        bind:value={query}
        id="{uid}-query"
        class="flex-fill"
        type="search"
        autofocus
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
  {/snippet}

  {#if results.rows.length === 0}
    {#if query.trim().length > 0}
      <p class="px-5 py-5 text-sm text-muted">{paletteNothing(filter, scoped)}</p>
    {/if}
  {:else}
    <div class="col gap-3 p-2">
      {#each results.sections as group (group.label)}
        <div class="col gap-1">
          <Divider>{group.label}</Divider>
          <ul class="col gap-1 list-reset" aria-label={group.label}>
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

  {#snippet footer()}
    <span>{resultCount(results.rows.length)}</span>
    <span>{PALETTE_KEYS}</span>
  {/snippet}
</Modal>
