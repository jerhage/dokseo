<script lang="ts">
  import { match } from 'ts-pattern';
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { goto } from '$app/navigation';
  import Alert from '$lib/ui/components/Alert.svelte';
  import { NARROW_SCREEN_QUERY } from '$lib/ui/core/breakpoints.js';
  import Button from '$lib/ui/components/Button.svelte';
  import Divider from '$lib/ui/components/Divider.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import KeyHints from '$lib/ui/components/KeyHints.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import SearchField from '$lib/ui/components/SearchField.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import TagToggle from '$lib/ui/components/TagToggle.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { PassageOrder } from '../../domain/capture/capture-order';
  import type { SearchedBook } from '../../domain/capture/capture-results';
  import type { Tag } from '../../domain/tag/tag';
  import type { CaptureFindRead } from './capture-find';
  import { CAPTURES_UNREAD_MESSAGE, PALETTE_KEYS, resultCount } from './search-copy';
  import { openerOf } from './search-opener';
  import { SearchPalette } from './search-palette.svelte';
  import type { SearchRow, SearchScope } from './search-rows';
  import SearchResult from './SearchResult.svelte';

  type Props = {
    readonly book: BookId | null;
    readonly books: readonly SearchedBook[];
    readonly covers?: ReadonlyMap<BookId, string>;
    readonly counts?: ReadonlyMap<BookId, number>;
    readonly tags?: readonly Tag[];
    readonly find: CaptureFindRead;
    readonly passages: PassageOrder;
    readonly onopen?: () => void;
    readonly onfollowedInBook?: () => void;
    readonly notice?: Snippet;
  };

  const SCOPES: readonly { readonly value: SearchScope; readonly label: string }[] = [
    { value: 'book', label: 'This book' },
    { value: 'all', label: 'All books' },
  ];

  const narrowScreen = new MediaQuery(NARROW_SCREEN_QUERY);

  let {
    book,
    books,
    covers = new Map(),
    counts = new Map(),
    tags = [],
    find,
    passages,
    onopen,
    onfollowedInBook,
    notice,
  }: Props = $props();

  const palette = new SearchPalette(() => ({
    book,
    books,
    covers,
    counts,
    tags,
    captures: find.captures,
    passages,
    read: find.state,
    room: narrowScreen.current ? 'narrow' : 'wide',
  }));

  let list = $state<(HTMLElement | null | undefined)[]>([]);
  let field = $state<HTMLInputElement | null>();
  let lastPressed: HTMLElement | null = null;
  let opener: HTMLElement | null = null;

  const results = $derived(palette.results);
  const cursor = $derived(palette.cursor);
  const note = $derived(palette.note);

  function remember(event: PointerEvent): void {
    const control = event.target instanceof Element ? event.target.closest('button, a') : null;
    lastPressed = control instanceof HTMLElement ? control : null;
  }

  function reveal(chosen: SearchScope): void {
    const focused = document.activeElement;
    opener = openerOf(focused instanceof HTMLElement ? focused : null, lastPressed, document.body);
    palette.reveal(chosen);
    find.reload();
    onopen?.();
    void selectKeptQuery();
  }

  async function selectKeptQuery(): Promise<void> {
    await tick();
    if (palette.query !== '') field?.select();
  }

  export function searchEverything(): void {
    reveal('all');
  }

  export function searchThisBook(): void {
    reveal('book');
  }

  function gone(): void {
    palette.gone();
    if (opener?.isConnected === true && document.activeElement === document.body) opener.focus();
    opener = null;
  }

  function moveBy(by: number): void {
    list[palette.moveBy(by)]?.scrollIntoView({ block: 'nearest' });
  }

  function open(row: SearchRow, newTab: boolean): void {
    if (newTab) {
      window.open(row.href, '_blank', 'noopener');
      return;
    }

    palette.hide();
    const from = book;
    void goto(row.href).then(() => {
      if (from !== null && book === from) onfollowedInBook?.();
    });
  }

  function openAtCursor(event: KeyboardEvent, newTab: boolean): void {
    const row = palette.rowAtCursor();
    if (row === undefined) return;

    event.preventDefault();
    open(row, newTab);
  }

  function shortcuts(event: KeyboardEvent): void {
    lastPressed = null;

    match(palette.keyFor(event))
      .with({ kind: 'ignore' }, () => {})
      .with({ kind: 'open' }, ({ newTab }) => openAtCursor(event, newTab))
      .with({ kind: 'reveal' }, ({ scope: chosen }) => {
        event.preventDefault();
        reveal(chosen);
      })
      .with({ kind: 'choose' }, ({ scope: chosen }) => {
        event.preventDefault();
        palette.choose(chosen);
      })
      .with({ kind: 'hide' }, () => {
        event.preventDefault();
        palette.hide();
      })
      .with({ kind: 'move' }, ({ by }) => {
        event.preventDefault();
        moveBy(by);
      })
      .exhaustive();
  }

  function dragged(): void {
    if (field?.isSameNode(document.activeElement)) field.blur();
  }

  function blurOnDrag(resultList: HTMLElement): () => void {
    resultList.addEventListener('touchmove', dragged, { passive: true });
    return () => resultList.removeEventListener('touchmove', dragged);
  }

  function toggleTags(event: MouseEvent): void {
    event.preventDefault();
    palette.toggleTags();
  }

  function pickScope(event: MouseEvent, chosen: SearchScope): void {
    event.preventDefault();
    palette.choose(chosen);
  }
</script>

<svelte:window onkeydown={shortcuts} onpointerdowncapture={remember} />

<Modal
  bind:open={palette.shown}
  aria-label="Find in captures"
  size="lg"
  placement="top"
  fillNarrow
  flushBody
  infoFooter
  wrapFocus
  onclose={gone}
>
  {#snippet header()}
    <SearchField
      bind:value={palette.query}
      bind:ref={field}
      label="Find in captures"
      hideLabel
      clearable
      onclear={() => palette.restart()}
      class="flex-fill"
      enterkeyhint="search"
      autofocus
      placeholder={palette.invite}
      oninput={() => palette.restart()}
    />
    <Button variant="ghost" class="modal-fill-only" onclick={() => palette.hide()}>Cancel</Button>
    <span class="row items-center gap-1">
      {#if book !== null}
        {#each SCOPES as choice (choice.value)}
          <TagToggle
            class="modal-panel-only"
            pressed={palette.scope === choice.value}
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
          value={palette.scope}
          onvaluechange={(chosen) => palette.choose(chosen)}
        />
      {/if}
      <TagToggle pressed={palette.filter === 'tags'} onclick={toggleTags}>Tags</TagToggle>
    </span>
  {/snippet}

  {#if notice !== undefined && find.unreadable.length > 0}
    <div class="p-3">{@render notice()}</div>
  {/if}

  {#if note.kind === 'unread'}
    <div class="p-3">
      <Alert variant="danger">
        {CAPTURES_UNREAD_MESSAGE}
        {#snippet actions()}
          <Button size="sm" onclick={() => find.reload()}>Try again</Button>
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
