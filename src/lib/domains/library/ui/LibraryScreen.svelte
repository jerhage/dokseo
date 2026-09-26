<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import { tick } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import SearchIcon from '$lib/components/icons/Search.svelte';
  import UploadIcon from '$lib/components/icons/Upload.svelte';
  import X from '$lib/components/icons/X.svelte';
  import { keyboardScrolling } from '$lib/components/keyboard-scrolling';
  import NavLink from '$lib/components/NavLink.svelte';
  import WindowDropzone from '$lib/components/WindowDropzone.svelte';
  import { filesFromDataTransfer } from '$lib/platform/files/dropped-files';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { BookEdit } from '../domain/book/book';
  import { DROP_INVITATION } from './accepted-formats';
  import type { LibraryScrollView } from './library-scroll-view.svelte';
  import type { LibraryView } from './library-view.svelte';
  import {
    GITHUB_MARK,
    SOURCE_LABEL,
    SOURCE_URL,
    isSearching,
    libraryBody,
    librarySummary,
    matchedText,
    showsFilter,
    storageText,
    titledBooks,
  } from './library-overview';
  import BookSettings from './BookSettings.svelte';
  import ContinueReading from './ContinueReading.svelte';
  import ImportStatus from './ImportStatus.svelte';
  import LibraryMenu from './LibraryMenu.svelte';
  import { LIBRARY_SECTIONS } from './library-sections';
  import LibrarySearch from './LibrarySearch.svelte';
  import RemoveBook from './RemoveBook.svelte';
  import ShelfView from './ShelfView.svelte';
  import UploadStrip from './UploadStrip.svelte';
  import {
    readArrangement,
    saveCollectionView,
    saveShelf,
    saveSortOrder,
  } from './library-arrangement';
  import { continueReading, shelfBooks, sortBooks } from './library-shelves';
  import type { CollectionView, Shelf, SortOrder } from './library-shelves';

  type Props = {
    readonly view: LibraryView;
    readonly scroll: LibraryScrollView;
    readonly notice?: string | null;
    readonly onsearcheverything?: (() => void) | undefined;
    query?: string;
  };

  let { view, scroll, notice = null, onsearcheverything, query = $bindable('') }: Props = $props();

  let main = $state<HTMLElement | null>(null);

  let strip = $state<ReturnType<typeof UploadStrip> | null>(null);
  let search = $state<ReturnType<typeof LibrarySearch> | null>(null);
  let searchToggle = $state<HTMLButtonElement>();
  let filterOpened = $state(false);
  let openSettingsFor = $state<BookId | null>(null);
  let removeFor = $state<BookId | null>(null);
  const arrangement = readArrangement();
  let shelf = $state<Shelf>(arrangement.shelf);
  let order = $state<SortOrder>(arrangement.order);
  let layout = $state<CollectionView>(arrangement.layout);

  function chooseShelf(next: Shelf): void {
    shelf = next;
    saveShelf(next);
  }

  function chooseOrder(next: SortOrder): void {
    order = next;
    saveSortOrder(next);
  }

  function chooseLayout(next: CollectionView): void {
    layout = next;
    saveCollectionView(next);
  }

  const settingsBook = $derived(view.books.find((book) => book.id === openSettingsFor) ?? null);
  const removeBook = $derived(view.books.find((book) => book.id === removeFor) ?? null);

  async function save(id: BookId, edit: BookEdit): Promise<void> {
    await view.edit(id, edit);
    openSettingsFor = null;
  }

  async function remove(id: BookId): Promise<void> {
    await view.remove(id);
    removeFor = null;
  }

  const searching = $derived(isSearching(query));
  const filterShown = $derived(showsFilter(filterOpened, query));

  async function openFilter(): Promise<void> {
    filterOpened = true;
    await tick();
    search?.focus();
  }

  async function closeFilter(): Promise<void> {
    query = '';
    filterOpened = false;
    await tick();
    searchToggle?.focus();
  }
  const titled = $derived(titledBooks(view.books, query));
  const space = $derived(storageText(view.storedBytes));
  const summary = $derived(librarySummary(view.books, view.storedBytes));
  const body = $derived(libraryBody(view.status, view.books.length, view.pending !== null));
  const shown = $derived(sortBooks(shelfBooks(titled, shelf), order));
  const matched = $derived(matchedText(shown.length));
  const resumable = $derived(searching ? [] : continueReading(view.books));

  $effect(() => {
    const top = scroll.settle(body);
    if (top !== null && main !== null) main.scrollTop = top;
  });
</script>

<div class="layout-app-shell">
  <header
    class="layout-app-shell-header wrap layout-app-shell-narrow-nowrap layout-app-shell-narrow-touch"
  >
    <div class={['row items-center gap-2 min-w-0', { 'layout-app-shell-wide-only': filterShown }]}>
      <Avatar shape="square" size="sm" lang="ja" aria-hidden="true">読</Avatar>
      <div class="col gap-0 flex-1">
        <span class="display weight-semibold">Library</span>
        <span
          class="text-xs text-muted truncate layout-app-shell-narrow-only"
          title={summary}
          aria-hidden="true">{summary}</span
        >
      </div>
    </div>
    <div
      class={[
        'row wrap items-center gap-3 flex-fill justify-end layout-app-shell-narrow-nowrap',
        { 'layout-app-shell-narrow-fit': !filterShown },
      ]}
    >
      <LibrarySearch
        bind:this={search}
        bind:query
        {matched}
        onclose={filterOpened ? closeFilter : undefined}
        class={{ 'layout-app-shell-wide-only': !filterShown }}
      />
      <span class="text-xs text-faint layout-app-shell-wide-only"
        ><kbd>⌘K</kbd> to search everything</span
      >
      <Button
        variant="primary"
        class="layout-app-shell-wide-only"
        disabled={view.busy || strip === null}
        onclick={() => strip?.choose()}
      >
        {view.busy ? 'Adding…' : 'Upload'}
      </Button>
      <div class="row layout-app-shell-wide-only">
        <AppearanceSwitcher />
      </div>
      <div class="row items-center gap-1 layout-app-shell-narrow-only">
        {#if filterShown}
          <Button variant="ghost" square aria-label="Close the filter" onclick={closeFilter}>
            <X class="btn-icon" />
          </Button>
        {:else}
          <Button
            variant="ghost"
            square
            aria-label="Filter these titles"
            bind:ref={searchToggle}
            onclick={openFilter}
          >
            <SearchIcon class="btn-icon" />
          </Button>
        {/if}
        <Button
          variant="primary"
          square
          aria-label={view.busy ? 'Adding…' : 'Upload'}
          disabled={view.busy || strip === null}
          onclick={() => strip?.choose()}
        >
          <UploadIcon class="btn-icon" />
        </Button>
        <LibraryMenu {onsearcheverything} />
      </div>
    </div>
  </header>

  <nav class="layout-app-shell-nav layout-app-shell-wide-only" aria-label="Sections">
    {#each LIBRARY_SECTIONS as section (section.href)}
      <NavLink href={section.href} current={section.current} title={section.title}
        >{section.name}</NavLink
      >
    {/each}
  </nav>

  <main
    class="layout-main-area"
    tabindex="-1"
    bind:this={main}
    onscroll={(event) => scroll.track(event.currentTarget.scrollTop)}
    {@attach keyboardScrolling}
  >
    <div class="col gap-1 layout-app-shell-narrow-visually-hidden">
      <h1 class="text-lg">Your uploads</h1>
      <p class="text-xs text-muted">{summary}</p>
    </div>

    {#if notice !== null}
      <Alert variant="warning" role="alert">{notice}</Alert>
    {/if}

    {#if view.message !== null}
      <Alert variant="danger" role="alert">{view.message}</Alert>
    {/if}

    {#if view.pending !== null}
      <ImportStatus title={view.pending} language="ja" stage={view.progress} />
    {/if}

    {#if body === 'reading'}
      <p class="text-sm text-muted" aria-live="polite">Reading your library…</p>
    {:else}
      {#if body === 'failed'}
        <div class="row wrap items-center gap-3 text-sm text-muted">
          <span>Your library could not be read.</span>
          <Button size="sm" onclick={() => void view.load()}>Try again</Button>
        </div>
      {:else if body === 'empty'}
        <p class="text-sm text-muted">No uploads yet. {DROP_INVITATION.toLowerCase()} to start.</p>
      {/if}

      {#if resumable.length > 0}
        <ContinueReading books={resumable} covers={view.covers} />
      {/if}

      {#if view.books.length > 0}
        <ShelfView
          books={titled}
          {shown}
          covers={view.covers}
          {searching}
          bind:shelf={() => shelf, chooseShelf}
          bind:order={() => order, chooseOrder}
          bind:layout={() => layout, chooseLayout}
          busy={(id) => view.removing === id || view.editing === id}
          onedit={(id) => (openSettingsFor = id)}
          onremove={(id) => (removeFor = id)}
          onfinish={(id) => void view.markFinished(id)}
          onunread={(id) => void view.markUnread(id)}
        />
      {/if}

      <div hidden={searching}>
        <UploadStrip
          bind:this={strip}
          busy={view.busy}
          compact={view.books.length > 0}
          onfiles={(files) => void view.upload(files)}
        />
      </div>
    {/if}

    <footer class="row wrap items-center gap-4 pt-4 text-xs text-faint">
      {#if view.pending !== null}
        <span class="text-muted" aria-live="polite">1 upload in progress</span>
      {/if}
      <span class="ms-auto">{space}</span>
      <a
        class="row items-center text-muted"
        href={SOURCE_URL}
        target="_blank"
        rel="noreferrer"
        title={SOURCE_LABEL}
      >
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
          <path d={GITHUB_MARK} />
        </svg>
        <span class="visually-hidden">{SOURCE_LABEL}</span>
      </a>
    </footer>
  </main>
</div>

<WindowDropzone
  disabled={view.busy || settingsBook !== null || removeBook !== null}
  readDrop={filesFromDataTransfer}
  onfiles={(files) => void view.upload(files)}
>
  Drop to add to your library
</WindowDropzone>

{#if settingsBook !== null}
  <BookSettings
    book={settingsBook}
    saving={view.editing === settingsBook.id}
    onsave={(edit) => void save(settingsBook.id, edit)}
    onclose={() => (openSettingsFor = null)}
  />
{/if}

{#if removeBook !== null}
  <RemoveBook
    book={removeBook}
    removing={view.removing === removeBook.id}
    onremove={() => void remove(removeBook.id)}
    onclose={() => (removeFor = null)}
  />
{/if}
