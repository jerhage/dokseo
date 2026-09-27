<script lang="ts">
  import { match } from 'ts-pattern';
  import { MediaQuery } from 'svelte/reactivity';
  import { goto } from '$app/navigation';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import Divider from '$lib/components/Divider.svelte';
  import X from '$lib/components/icons/X.svelte';
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
  import {
    CAPTURES_UNREAD_MESSAGE,
    PALETTE_KEYS,
    paletteInvite,
    paletteNote,
    resultCount,
  } from './palette-copy';
  import { paletteKey } from './palette-keys';
  import { openerOf } from './palette-opener';
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

  const uid = $props.id();
  let shown = $state(false);
  let present = $state(false);
  let query = $state('');
  let scope = $state<PaletteScope>('book');
  let filter = $state<PaletteFilter>('everything');
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

  const results = $derived(
    paletteRows({ found, scope: scoped, book, covers, counts, tags, query }),
  );

  const invite = $derived(paletteInvite(filter, scoped, narrowScreen.current ? 'narrow' : 'wide'));

  const cursor = $derived(at >= results.rows.length ? NO_MATCH : at);

  const note = $derived(
    paletteNote({
      status: find.status,
      query,
      rows: results.rows.length,
      filter,
      scope: scoped,
    }),
  );

  function choose(chosen: PaletteScope): void {
    scope = chosen;
    at = NO_MATCH;
  }

  function remember(event: PointerEvent): void {
    const control = event.target instanceof Element ? event.target.closest('button, a') : null;
    lastPressed = control instanceof HTMLElement ? control : null;
  }

  function reveal(chosen: PaletteScope): void {
    const focused = document.activeElement;
    opener = openerOf(focused instanceof HTMLElement ? focused : null, lastPressed, document.body);
    shown = true;
    present = true;
    choose(chosen);
    void find.load();
    onopen?.();
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
    lastPressed = null;
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

  function clear(): void {
    query = '';
    at = NO_MATCH;
    field?.focus();
  }

  function keepFocus(event: MouseEvent): void {
    event.preventDefault();
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

  function pickScope(event: MouseEvent, chosen: PaletteScope): void {
    event.preventDefault();
    choose(chosen);
  }
</script>

<svelte:window onkeydown={shortcuts} onpointerdowncapture={remember} />

{#snippet scopeChoices(placed: string | undefined)}
  {#each SCOPES as choice (choice.value)}
    <TagToggle
      class={placed}
      pressed={scope === choice.value}
      onclick={(event) => pickScope(event, choice.value)}
    >
      {choice.label}
    </TagToggle>
  {/each}
{/snippet}

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
    <div class="modal-header wrap items-center gap-2 p-3">
      <label class="visually-hidden" for="{uid}-query">Find in captures</label>
      <div class="input-clearable flex-fill">
        <Input
          bind:value={query}
          bind:ref={field}
          id="{uid}-query"
          type="search"
          enterkeyhint="search"
          autofocus
          placeholder={invite}
          oninput={() => (at = NO_MATCH)}
        />
        {#if query !== ''}
          <Button
            variant="ghost"
            size="sm"
            square
            class="input-clear"
            aria-label="Clear the search"
            onmousedown={keepFocus}
            onclick={clear}
          >
            <X />
          </Button>
        {/if}
      </div>
      <Button variant="ghost" class="modal-fill-only" onclick={hide}>Cancel</Button>
      <span class="row items-center gap-1">
        {#if book !== null}
          {@render scopeChoices('modal-panel-only')}
          <Divider vertical class="modal-panel-only" />
          <span class="tag-segmented modal-fill-only" role="group" aria-label="Search in">
            {@render scopeChoices(undefined)}
          </span>
        {/if}
        <TagToggle pressed={filter === 'tags'} onclick={toggleTags}>Tags</TagToggle>
      </span>
    </div>
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
    <p class="px-5 py-5 text-sm text-muted">{note.message}</p>
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
    <span role="status">{resultCount(results.rows.length)}</span>
    <span class="hidden-on-touch">{PALETTE_KEYS}</span>
  {/snippet}
</Modal>
