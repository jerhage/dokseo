<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import IconButton from '$lib/components/IconButton.svelte';
  import SearchIcon from '$lib/components/icons/Search.svelte';
  import UploadIcon from '$lib/components/icons/Upload.svelte';
  import { keyboardScrolling } from '$lib/components/keyboard-scrolling';
  import KeyHints from '$lib/components/KeyHints.svelte';
  import NavLink from '$lib/components/NavLink.svelte';
  import WindowDropzone from '$lib/components/WindowDropzone.svelte';
  import { filesFromDataTransfer } from '$lib/platform/files/dropped-files';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { BookEdit } from '../domain/book/book';
  import type { LibraryScrollView } from './library-scroll-view.svelte';
  import type { LibraryView } from './library-view.svelte';
  import {
    GITHUB_MARK,
    SEARCH_EVERYTHING_HINTS,
    SOURCE_LABEL,
    SOURCE_URL,
    isSearching,
    librarySummary,
    matchedText,
    storageText,
    titledBooks,
  } from './library-overview';
  import BookSettings from './BookSettings.svelte';
  import { arrivedFiles } from './chosen-files';
  import ContinueReading from './ContinueReading.svelte';
  import ImportStatus from './ImportStatus.svelte';
  import LibraryBooksData from './LibraryBooksData.svelte';
  import LibraryMenu from './LibraryMenu.svelte';
  import { LIBRARY_SECTIONS } from './library-sections';
  import { libraryBody } from './library-shelf';
  import type { ShelfRead } from './library-shelf';
  import LibrarySearch from './LibrarySearch.svelte';
  import RemoveBook from './RemoveBook.svelte';
  import ShelfView from './ShelfView.svelte';
  import UploadStrip from './UploadStrip.svelte';
  import { uploadsInProgressText } from './upload-progress-text';
  import { continueReading } from './library-shelves';
  import { ShelfArrangement } from './shelf-arrangement.svelte';

  type Props = {
    readonly view: LibraryView;
    readonly shelfRead: ShelfRead;
    readonly scroll: LibraryScrollView;
    readonly onsearcheverything?: (() => void) | undefined;
    query?: string;
  };

  let { view, shelfRead, scroll, onsearcheverything, query = $bindable('') }: Props = $props();

  let main = $state<HTMLElement | null>(null);

  let strip = $state<ReturnType<typeof UploadStrip> | null>(null);
  let openSettingsFor = $state<BookId | null>(null);
  let removeFor = $state<BookId | null>(null);
  const arrangement = new ShelfArrangement();

  const settingsBook = $derived(
    shelfRead.books.find((book) => book.id === openSettingsFor) ?? null,
  );
  const removeBook = $derived(shelfRead.books.find((book) => book.id === removeFor) ?? null);

  async function save(id: BookId, edit: BookEdit): Promise<void> {
    const outcome = await view.changes.edit(id, edit);
    if (outcome !== 'failed') openSettingsFor = null;
  }

  function openBook(id: BookId): void {
    void goto(`/read/${encodeURIComponent(id)}`);
  }

  function upload(files: readonly File[]): void {
    void view.upload.add(files, openBook);
  }

  async function remove(id: BookId): Promise<void> {
    const outcome = await view.changes.remove(id);
    if (outcome !== 'failed') removeFor = null;
  }

  const searching = $derived(isSearching(query));
  const titled = $derived(titledBooks(shelfRead.books, query));
  const space = $derived(storageText(shelfRead.storedBytes));
  const summary = $derived(librarySummary(shelfRead.books, shelfRead.storedBytes));
  const body = $derived(libraryBody(shelfRead.state, view.upload.pending !== null));
  const shown = $derived(arrangement.arrange(titled));
  const matched = $derived(matchedText(shown.length));
  const resumable = $derived(searching ? [] : continueReading(shelfRead.books));

  $effect(() => {
    const top = scroll.settle(body);
    if (top !== null && main !== null) main.scrollTop = top;
  });
</script>

<div class="layout-app-shell">
  <header
    class="layout-app-shell-header wrap layout-app-shell-narrow-nowrap layout-app-shell-narrow-touch"
  >
    <div class="row items-center gap-2 min-w-0">
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
      class="row wrap items-center gap-3 flex-fill justify-end layout-app-shell-narrow-nowrap layout-app-shell-narrow-fit"
    >
      <LibrarySearch bind:query {matched} class="layout-app-shell-wide-only" />
      <KeyHints
        hints={SEARCH_EVERYTHING_HINTS}
        variant="inline"
        element="span"
        class="text-faint layout-app-shell-wide-only"
      />
      <Button
        variant="primary"
        class="layout-app-shell-wide-only"
        disabled={view.upload.busy || strip === null}
        onclick={() => strip?.choose()}
      >
        {view.upload.busy ? 'Adding…' : 'Upload'}
      </Button>
      <div class="row layout-app-shell-wide-only">
        <AppearanceSwitcher />
      </div>
      <div class="row items-center gap-1 layout-app-shell-narrow-only">
        {#if onsearcheverything !== undefined}
          <IconButton
            variant="ghost"
            icon={SearchIcon}
            label="Search everything"
            tooltip={false}
            onclick={onsearcheverything}
          />
        {/if}
        <IconButton
          variant="primary"
          icon={UploadIcon}
          label={view.upload.busy ? 'Adding…' : 'Upload'}
          tooltip={false}
          disabled={view.upload.busy || strip === null}
          onclick={() => strip?.choose()}
        />
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

    {#if view.upload.pending !== null}
      <ImportStatus
        title={view.upload.pending}
        language="ja"
        stage={view.upload.progress}
        batch={view.upload.batch}
      />
    {/if}

    <LibraryBooksData
      state={shelfRead.state}
      importing={view.upload.pending !== null}
      onretry={shelfRead.reload}
    >
      {#snippet children(library)}
        {#if resumable.length > 0}
          <ContinueReading books={resumable} covers={library.covers} />
        {/if}

        {#if library.books.length > 0}
          <ShelfView
            books={titled}
            {shown}
            covers={library.covers}
            {searching}
            bind:shelf={() => arrangement.shelf.value, (next) => arrangement.shelf.choose(next)}
            bind:order={() => arrangement.order.value, (next) => arrangement.order.choose(next)}
            bind:layout={() => arrangement.layout.value, (next) => arrangement.layout.choose(next)}
            busy={(id) => view.changes.removing === id || view.changes.editing === id}
            onedit={(id) => (openSettingsFor = id)}
            onremove={(id) => (removeFor = id)}
            onfinish={(id) =>
              void view.changes.markFinished(id, arrangement.shelf.value, shelfRead.books)}
            onunread={(id) =>
              void view.changes.markUnread(id, arrangement.shelf.value, shelfRead.books)}
          />
        {/if}

        <div hidden={searching}>
          <UploadStrip
            bind:this={strip}
            busy={view.upload.busy}
            compact={library.books.length > 0}
            onfiles={(selection) => upload(arrivedFiles(selection))}
          />
        </div>
      {/snippet}
    </LibraryBooksData>

    <footer class="row wrap items-center gap-4 pt-4 text-xs text-faint">
      {#if view.upload.pending !== null}
        <span class="text-muted" aria-live="polite">{uploadsInProgressText(view.upload.batch)}</span
        >
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
  disabled={view.upload.busy || settingsBook !== null || removeBook !== null}
  readDrop={filesFromDataTransfer}
  onfiles={(selection) => upload(arrivedFiles(selection))}
>
  Drop to add to your library
</WindowDropzone>

{#if settingsBook !== null}
  <BookSettings
    book={settingsBook}
    saving={view.changes.editing === settingsBook.id}
    onsave={(edit) => void save(settingsBook.id, edit)}
    onclose={() => (openSettingsFor = null)}
  />
{/if}

{#if removeBook !== null}
  <RemoveBook
    book={removeBook}
    removing={view.changes.removing === removeBook.id}
    onremove={() => void remove(removeBook.id)}
    onclose={() => (removeFor = null)}
  />
{/if}
