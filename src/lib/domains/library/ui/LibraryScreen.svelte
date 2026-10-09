<script lang="ts">
  import type { HeaderSearch } from '$lib/shared/header-search';
  import { match } from 'ts-pattern';
  import type { Snippet } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/ui/components/Button.svelte';
  import IconButton from '$lib/ui/components/IconButton.svelte';
  import SelectedShelfIcon from '$lib/ui/components/icons/SelectedShelf.svelte';
  import SearchIcon from '$lib/ui/components/icons/Search.svelte';
  import UploadIcon from '$lib/ui/components/icons/Upload.svelte';
  import { keyboardScrolling } from '$lib/ui/components/keyboard-scrolling';
  import KeyHints from '$lib/ui/components/KeyHints.svelte';
  import NavLink from '$lib/ui/components/NavLink.svelte';
  import WindowDropzone from '$lib/ui/components/WindowDropzone.svelte';
  import { filesFromDataTransfer } from '$lib/platform/files/dropped-files';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import type { BookCapturesExporting } from '$lib/shared/book-captures-export.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { BookEdit } from '../domain/book/book';
  import { openedBook } from './book-details';
  import type { BookDetailsHook } from './book-details.svelte';
  import type { BookChanges } from './book-changes.svelte';
  import { createBookDialogs } from './book-dialogs.svelte';
  import type { BookUpload } from './book-upload.svelte';
  import type { LibraryScrollHook } from './library-scroll-view.svelte';
  import type { RemovedBookDeletion } from './removed-book-deletion.svelte';
  import {
    GITHUB_MARK,
    SEARCH_EVERYTHING_HINTS,
    SOURCE_LABEL,
    SOURCE_URL,
    isSearching,
    librarySummary,
    matchedText,
    narrowedBooks,
    storageText,
    titledBooks,
  } from './library-overview';
  import BookDetails from './BookDetails.svelte';
  import BookSettings from './BookSettings.svelte';
  import { arrivedFiles } from './chosen-files';
  import ContinueReading from './ContinueReading.svelte';
  import DeviceFilterField from './DeviceFilterField.svelte';
  import DeleteRemovedCaptures from './DeleteRemovedCaptures.svelte';
  import ImportStatus from './ImportStatus.svelte';
  import LibraryBooksData from './LibraryBooksData.svelte';
  import LibraryMenu from './LibraryMenu.svelte';
  import { LIBRARY_SECTIONS } from './library-sections';
  import { libraryBody } from './library-shelf';
  import type { ShelfRead } from './library-shelf';
  import LibrarySearch from './LibrarySearch.svelte';
  import RemoveBook from './RemoveBook.svelte';
  import RemovedBooks from './RemovedBooks.svelte';
  import { removedEntryFor } from './removed-books';
  import type { BookRemoval } from './removed-books';
  import ShelfView from './ShelfView.svelte';
  import UnreadableBooks from './UnreadableBooks.svelte';
  import UploadStrip from './UploadStrip.svelte';
  import { uploadsInProgressText } from './upload-progress-text';
  import { arrangeBooks, bookById, continueReading } from './library-shelves';
  import { createShelfArrangement } from './shelf-arrangement.svelte';

  type Props = {
    readonly uploads: BookUpload;
    readonly changes: BookChanges;
    readonly removed: RemovedBookDeletion;
    readonly exporting: BookCapturesExporting;
    readonly details: BookDetailsHook;
    readonly shelfRead: ShelfRead;
    readonly scroll: LibraryScrollHook;
    readonly onsearcheverything?: (() => void) | undefined;
    readonly tabbed?: Snippet<[Snippet]> | undefined;
    readonly bookBadge?: Snippet<[BookId]> | undefined;
    readonly bookSource?: Snippet<[BookId]> | undefined;
    readonly bookFilter?: ((id: BookId) => boolean) | undefined;
    readonly filterControls?: Snippet | undefined;
    readonly headerSearch?: HeaderSearch | undefined;
    query?: string;
  };

  let {
    uploads,
    changes,
    removed,
    exporting,
    details,
    shelfRead,
    scroll,
    onsearcheverything,
    tabbed,
    bookBadge,
    bookSource,
    bookFilter,
    filterControls,
    headerSearch,
    query = $bindable(''),
  }: Props = $props();

  let main = $state<HTMLElement | null>(null);

  let strip = $state<ReturnType<typeof UploadStrip> | null>(null);
  const arrangement = createShelfArrangement();
  const dialogs = createBookDialogs();

  const settingsBook = $derived(bookById(shelfRead.books, dialogs.settingsFor));
  const removeBook = $derived(bookById(shelfRead.books, dialogs.removeFor));
  const deleteCaptures = $derived(
    dialogs.deleteCapturesFor === null
      ? null
      : removedEntryFor(dialogs.deleteCapturesFor, shelfRead.removed, shelfRead.unreadableRemoved),
  );

  async function save(id: BookId, edit: BookEdit): Promise<void> {
    const outcome = await changes.edit(id, edit);
    if (outcome !== 'failed') dialogs.closeSettings();
  }

  function finish(id: BookId): void {
    void changes.markFinished(id, arrangement.shelf, shelfRead.books);
  }

  function unread(id: BookId): void {
    void changes.markUnread(id, arrangement.shelf, shelfRead.books);
  }

  function openBook(id: BookId): void {
    void goto(`/read/${encodeURIComponent(id)}`);
  }

  function upload(files: readonly File[]): void {
    void uploads.add(files, openBook);
  }

  async function remove(id: BookId, removal: BookRemoval): Promise<void> {
    const outcome = await match(removal)
      .with('keep-captures', () => changes.remove(id))
      .with('delete-captures', () => changes.removeWithCaptures(id))
      .exhaustive();
    if (outcome !== 'failed') {
      dialogs.closeRemove();
      details.close();
    }
  }

  async function deleteRemovedCaptures(id: BookId): Promise<void> {
    const outcome = await removed.delete(id);
    if (outcome !== 'failed') dialogs.closeDeleteCaptures();
  }

  const searching = $derived(isSearching(query));
  const queried = $derived(titledBooks(shelfRead.books, query));
  const titled = $derived(narrowedBooks(queried, bookFilter));
  const narrowing = $derived(titled.length < queried.length);
  const space = $derived(storageText(shelfRead.storedBytes));
  const summary = $derived(librarySummary(shelfRead.books, shelfRead.storedBytes));
  const body = $derived(libraryBody(shelfRead.state, uploads.pending !== null));
  const shown = $derived(arrangeBooks(titled, arrangement.shelf, arrangement.order));
  const matched = $derived(matchedText(shown.length));
  const resumable = $derived(searching ? [] : continueReading(shelfRead.books));

  $effect(() => {
    const top = scroll.settle(body);
    if (top !== null && main !== null) main.scrollTop = top;
  });
</script>

{#snippet deviceContent()}
  <div class="col gap-1 layout-app-shell-narrow-visually-hidden">
    <h1 class="text-lg">Your uploads</h1>
    <p class="text-xs text-muted">{summary}</p>
  </div>

  {#if uploads.pending !== null}
    <ImportStatus
      title={uploads.pending}
      language="ja"
      stage={uploads.progress}
      batch={uploads.batch}
    />
  {/if}

  {#if shelfRead.unreadable.length > 0}
    <UnreadableBooks
      books={shelfRead.unreadable}
      shelf={shelfRead.books}
      busy={changes.removing !== null || changes.merging !== null}
      onremove={(id) => void changes.remove(id)}
      onmerge={(id, into) => void changes.merge(id, into)}
      onremoveall={() => void changes.removeEach(shelfRead.unreadable.map((book) => book.id))}
    />
  {/if}

  <LibraryBooksData
    state={shelfRead.state}
    importing={uploads.pending !== null}
    onretry={shelfRead.reload}
  >
    {#snippet children(library)}
      {#if library.books.length > 0}
        <DeviceFilterField bind:query />
      {/if}

      {#if resumable.length > 0}
        <ContinueReading books={resumable} covers={library.covers} />
      {/if}

      {#if library.books.length > 0 && filterControls !== undefined}
        <div class="row wrap items-center gap-2">
          {@render filterControls()}
        </div>
      {/if}

      {#if library.books.length > 0}
        <ShelfView
          books={titled}
          {shown}
          covers={library.covers}
          searching={searching || narrowing}
          {bookBadge}
          bind:shelf={() => arrangement.shelf, (next) => arrangement.chooseShelf(next)}
          bind:order={() => arrangement.order, (next) => arrangement.chooseOrder(next)}
          bind:layout={() => arrangement.layout, (next) => arrangement.chooseLayout(next)}
          busy={(id) => changes.removing === id || changes.editing === id}
          onedit={(id) => dialogs.openSettings(id)}
          onremove={(id) => dialogs.openRemove(id)}
          onfinish={finish}
          onunread={unread}
          ondetails={(id, from) => details.open(id, from)}
        />

        {@const opened = openedBook(shelfRead.books, details.openId)}
        {#if opened !== null}
          <BookDetails
            book={opened.book}
            details={opened.details}
            cover={library.covers.get(opened.book.id) ?? null}
            busy={changes.removing === opened.book.id || changes.editing === opened.book.id}
            onedit={(id) => dialogs.openSettings(id)}
            onremove={(id) => dialogs.openRemove(id)}
            onfinish={finish}
            onunread={unread}
            onclose={() => details.close()}
            {bookSource}
          />
        {/if}
      {/if}

      <div hidden={searching}>
        <UploadStrip
          bind:this={strip}
          busy={uploads.busy}
          compact={library.books.length > 0}
          onfiles={(selection) => upload(arrivedFiles(selection))}
        />
      </div>
    {/snippet}
  </LibraryBooksData>

  {#if shelfRead.removed.length > 0 || shelfRead.unreadableRemoved.length > 0}
    <RemovedBooks
      books={shelfRead.removed}
      unreadable={shelfRead.unreadableRemoved}
      busy={removed.deleting !== null}
      ondelete={(id) => dialogs.openDeleteCaptures(id)}
    />
  {/if}

  <footer class="row wrap items-center gap-4 pt-4 text-xs text-faint">
    {#if uploads.pending !== null}
      <span class="text-muted" aria-live="polite">{uploadsInProgressText(uploads.batch)}</span>
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
{/snippet}

<div class="layout-app-shell">
  <header
    class="layout-app-shell-header wrap layout-app-shell-narrow-nowrap layout-app-shell-narrow-touch"
  >
    <div class="row items-center gap-2 min-w-0">
      <IconButton href="/" variant="ghost" label="Your library" tooltip={false}
        ><SelectedShelfIcon class="brand-mark" /></IconButton
      >
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
      <LibrarySearch bind:query {matched} {headerSearch} class="layout-app-shell-wide-only" />
      <KeyHints
        hints={SEARCH_EVERYTHING_HINTS}
        variant="inline"
        element="span"
        class="text-faint layout-app-shell-wide-only"
      />
      <Button
        variant="primary"
        class="layout-app-shell-wide-only"
        disabled={uploads.busy || strip === null}
        onclick={() => strip?.choose()}
      >
        {uploads.busy ? 'Adding…' : 'Upload'}
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
          label={uploads.busy ? 'Adding…' : 'Upload'}
          tooltip={false}
          disabled={uploads.busy || strip === null}
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
    {#if tabbed !== undefined}
      {@render tabbed(deviceContent)}
    {:else}
      {@render deviceContent()}
    {/if}
  </main>
</div>

<WindowDropzone
  disabled={uploads.busy || settingsBook !== null || removeBook !== null || deleteCaptures !== null}
  readDrop={filesFromDataTransfer}
  onfiles={(selection) => upload(arrivedFiles(selection))}
>
  Drop to add to your library
</WindowDropzone>

{#if settingsBook !== null}
  <BookSettings
    book={settingsBook}
    saving={changes.editing === settingsBook.id}
    onsave={(edit) => void save(settingsBook.id, edit)}
    onclose={() => dialogs.closeSettings()}
  />
{/if}

{#if removeBook !== null}
  <RemoveBook
    book={removeBook}
    removing={changes.removing === removeBook.id}
    {exporting}
    onremove={(removal) => void remove(removeBook.id, removal)}
    onclose={() => dialogs.closeRemove()}
  />
{/if}

{#if deleteCaptures !== null}
  <DeleteRemovedCaptures
    book={deleteCaptures}
    deleting={removed.deleting === deleteCaptures.id}
    {exporting}
    ondelete={() => void deleteRemovedCaptures(deleteCaptures.id)}
    onclose={() => dialogs.closeDeleteCaptures()}
  />
{/if}
