<script lang="ts">
  import { match } from 'ts-pattern';
  import { tick } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { goto } from '$app/navigation';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import Divider from '$lib/components/Divider.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import KeyHints from '$lib/components/KeyHints.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import SearchField from '$lib/components/SearchField.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import TagToggle from '$lib/components/TagToggle.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { Capture } from '../../domain/capture/capture';
  import type { SearchedBook } from '../../domain/capture/capture-results';
  import { clampedIndex, NO_MATCH } from '../../domain/capture/match-stepping';
  import { quickFinds } from '../../domain/capture/quick-find';
  import type { SearchFilter, QuickFinds } from '../../domain/capture/quick-find';
  import type { Tag } from '../../domain/tag/tag';
  import type { CaptureSearchView } from './capture-search.svelte';
  import {
    CAPTURES_UNREAD_MESSAGE,
    PALETTE_KEYS,
    searchInvite,
    searchNote,
    resultCount,
  } from './search-copy';
  import { searchKey } from './search-keys';
  import { openerOf } from './search-opener';
  import { effectiveScope, searchRows, searchedBooks } from './search-rows';
  import type { SearchRow, SearchScope } from './search-rows';
  import SearchResult from './SearchResult.svelte';

  type Props = {
    readonly book: BookId | null;
    readonly books: readonly SearchedBook[];
    readonly covers?: ReadonlyMap<BookId, string>;
    readonly counts?: ReadonlyMap<BookId, number>;
    readonly tags?: readonly Tag[];
    readonly find: CaptureSearchView;
    readonly onopen?: () => void;
  };

  const SCOPES: readonly { readonly value: SearchScope; readonly label: string }[] = [
    { value: 'book', label: 'This book' },
    { value: 'all', label: 'All books' },
  ];

  const NOTHING: QuickFinds<Capture> = { books: [], captures: [] };

  const narrowScreen = new MediaQuery('(width < 48rem)');

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
  let present = $state(false);
  let query = $state('');
  let scope = $state<SearchScope>('book');
  let filter = $state<SearchFilter>('everything');
  let at = $state(NO_MATCH);
  let list = $state<(HTMLElement | undefined)[]>([]);
  let field = $state<HTMLInputElement>();
  let lastPressed: HTMLElement | null = null;
  let opener: HTMLElement | null = null;

  const scoped = $derived(effectiveScope(book, scope));

  const found = $derived(
    present && query.trim().length > 0
      ? quickFinds(find.captures, searchedBooks(books, book, scoped), tags, query, filter)
      : NOTHING,
  );

  const results = $derived(searchRows({ found, scope: scoped, book, covers, counts, tags, query }));

  const invite = $derived(searchInvite(filter, scoped, narrowScreen.current ? 'narrow' : 'wide'));

  const cursor = $derived(at >= results.rows.length ? NO_MATCH : at);

  const note = $derived(
    searchNote({
      status: find.status,
      query,
      rows: results.rows.length,
      filter,
      scope: scoped,
    }),
  );

  function choose(chosen: SearchScope): void {
    scope = chosen;
    at = NO_MATCH;
  }

  function remember(event: PointerEvent): void {
    const control = event.target instanceof Element ? event.target.closest('button, a') : null;
    lastPressed = control instanceof HTMLElement ? control : null;
  }

  function reveal(chosen: SearchScope): void {
    const focused = document.activeElement;
    opener = openerOf(focused instanceof HTMLElement ? focused : null, lastPressed, document.body);
    shown = true;
    present = true;
    choose(chosen);
    void find.load();
    onopen?.();
    void selectKeptQuery();
  }

  async function selectKeptQuery(): Promise<void> {
    await tick();
    if (field !== undefined && query !== '') field.select();
  }

  export function searchEverything(): void {
    reveal('all');
  }

  export function searchThisBook(): void {
    reveal('book');
  }

  function hide(): void {
    shown = false;
  }

  function gone(): void {
    present = false;
    if (opener?.isConnected === true && document.activeElement === document.body) opener.focus();
    opener = null;
  }

  function moveBy(by: number): void {
    at = clampedIndex(cursor, by, results.rows.length);
    list[at]?.scrollIntoView({ block: 'nearest' });
  }

  function open(row: SearchRow, newTab: boolean): void {
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
    lastPressed = null;
    const pressed = searchKey(event, { shown, scope, hasBook: book !== null });

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

  function dragged(): void {
    if (field !== undefined && document.activeElement === field) field.blur();
  }

  function blurOnDrag(resultList: HTMLElement): () => void {
    resultList.addEventListener('touchmove', dragged, { passive: true });
    return () => resultList.removeEventListener('touchmove', dragged);
  }

  function toggleTags(event: MouseEvent): void {
    event.preventDefault();
    filter = filter === 'tags' ? 'everything' : 'tags';
    at = NO_MATCH;
  }

  function pickScope(event: MouseEvent, chosen: SearchScope): void {
    event.preventDefault();
    choose(chosen);
  }
</script>

<svelte:window onkeydown={shortcuts} onpointerdowncapture={remember} />

<Modal
  bind:open={shown}
  aria-label="Find in captures"
  size="lg"
  placement="top"
  narrow="fill"
  body="flush"
  footerVariant="info"
  onclose={gone}
>
  {#snippet header()}
    <SearchField
      bind:value={query}
      bind:ref={field}
      label="Find in captures"
      hideLabel
      clearable
      onclear={() => (at = NO_MATCH)}
      class="flex-fill"
      enterkeyhint="search"
      autofocus
      placeholder={invite}
      oninput={() => (at = NO_MATCH)}
    />
    <Button variant="ghost" class="modal-fill-only" onclick={hide}>Cancel</Button>
    <span class="row items-center gap-1">
      {#if book !== null}
        {#each SCOPES as choice (choice.value)}
          <TagToggle
            class="modal-panel-only"
            pressed={scope === choice.value}
            onclick={(event) => pickScope(event, choice.value)}
          >
            {choice.label}
          </TagToggle>
        {/each}
        <Divider vertical class="modal-panel-only" />
        <SegmentedControl
          variant="track"
          label="Search in"
          class="modal-fill-only"
          options={SCOPES}
          value={scope}
          onvaluechange={choose}
        />
      {/if}
      <TagToggle pressed={filter === 'tags'} onclick={toggleTags}>Tags</TagToggle>
    </span>
  {/snippet}

  {#if note.kind === 'unread'}
    <div class="p-3">
      <Alert variant="danger">
        {CAPTURES_UNREAD_MESSAGE}
        {#snippet actions()}
          <Button size="sm" onclick={() => void find.load()}>Try again</Button>
        {/snippet}
      </Alert>
    </div>
  {:else if note.kind === 'nothing'}
    <EmptyState class="px-5 py-5" message={note.message} />
  {/if}

  {#if results.rows.length > 0}
    <div class="col gap-3 p-2" {@attach blurOnDrag}>
      {#each results.sections as group (group.label)}
        <div class="col gap-1">
          <Divider>{group.label}</Divider>
          <ul class="col gap-1 list-reset" aria-label={group.label}>
            {#each group.rows as row, order (row.key)}
              {@const place = group.from + order}
              <li>
                <SearchResult
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
    <span role="status">{resultCount(results.rows.length)}</span>
    <KeyHints
      hints={PALETTE_KEYS}
      variant="text"
      element="span"
      class="text-faint hidden-on-touch"
    />
  {/snippet}
</Modal>
