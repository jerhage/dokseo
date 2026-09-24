<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Button from '$lib/components/Button.svelte';
  import Divider from '$lib/components/Divider.svelte';
  import NavLink from '$lib/components/NavLink.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { BookEdit } from '../../../domain/book/book';
  import { DROP_INVITATION } from '../../accepted-formats';
  import type { LibraryView } from '../../library-view.svelte';
  import BookCard from './BookCard.svelte';
  import BookSettings from './BookSettings.svelte';
  import LibrarySearch from './LibrarySearch.svelte';
  import PendingCard from './PendingCard.svelte';
  import UploadTile from './UploadTile.svelte';
  import {
    GITHUB_MARK,
    SOURCE_LABEL,
    SOURCE_URL,
    isSearching,
    libraryBody,
    librarySummary,
    matchedText,
    storageText,
    titledBooks,
  } from '../library-overview';
  import './library-screen.css';

  type Props = {
    readonly view: LibraryView;
    readonly notice?: string | null;
    query?: string;
  };

  let { view, notice = null, query = $bindable('') }: Props = $props();

  let tile = $state<ReturnType<typeof UploadTile> | null>(null);
  let openSettingsFor = $state<BookId | null>(null);

  const settingsBook = $derived(view.books.find((book) => book.id === openSettingsFor) ?? null);

  async function save(id: BookId, edit: BookEdit): Promise<void> {
    await view.edit(id, edit);
    openSettingsFor = null;
  }

  const searching = $derived(isSearching(query));
  const titled = $derived(titledBooks(view.books, query));
  const space = $derived(storageText(view.storedBytes));
  const summary = $derived(librarySummary(view.books, view.storedBytes));
  const body = $derived(libraryBody(view.status, view.books.length, view.pending !== null));
  const matched = $derived(matchedText(titled.length));
</script>

<div class="library-screen surface-bg">
  <nav class="col items-center gap-2 px-3 py-4 surface" aria-label="Sections">
    <Avatar shape="square" size="sm" lang="ja" aria-hidden="true">読</Avatar>
    <NavLink href="/tags" title="Tags across your documents">
      <span aria-hidden="true">#</span>
      <span class="visually-hidden">Tags</span>
    </NavLink>
    <span class="flex-1"></span>
    <NavLink href="/settings" title="OCR engine settings">
      <span aria-hidden="true">⚙</span>
      <span class="visually-hidden">Settings</span>
    </NavLink>
  </nav>

  <Divider vertical />

  <div class="main">
    <header class="row wrap items-end gap-4 px-6 pt-5 pb-4">
      <div class="flex-1">
        <h1 class="text-lg">Your uploads</h1>
        <p class="mt-1 text-xs text-muted">{summary}</p>
      </div>
      <div class="row wrap items-center gap-2">
        <LibrarySearch bind:query {matched} label="Filter these titles" />
        <span class="text-xs mono text-faint">⌘K to search everything</span>
        <Button
          variant="primary"
          disabled={view.busy || tile === null}
          onclick={() => tile?.choose()}
        >
          {view.busy ? 'Adding…' : 'Upload pages'}
        </Button>
      </div>
    </header>

    <Divider />

    <section class="body px-6 py-5">
      <div class="stack-md">
        {#if notice !== null}
          <Alert variant="warning" role="alert">{notice}</Alert>
        {/if}

        {#if view.message !== null}
          <Alert variant="danger" role="alert">{view.message}</Alert>
        {/if}

        {#if body === 'reading'}
          <p class="text-sm text-muted" aria-live="polite">Reading your library…</p>
        {:else}
          {#if body === 'failed'}
            <p class="row items-center gap-3 text-sm text-muted">
              <span>Your library could not be read.</span>
              <Button size="sm" onclick={() => void view.load()}>Try again</Button>
            </p>
          {:else if body === 'empty'}
            <p class="text-sm text-muted">
              No uploads yet. {DROP_INVITATION.toLowerCase()} to start.
            </p>
          {/if}

          <ul class="grid-auto p-0">
            {#if view.pending !== null}
              <li hidden={searching}>
                <PendingCard title={view.pending} language="ja" stage={view.progress} />
              </li>
            {/if}
            {#each titled as book (book.id)}
              <li>
                <BookCard
                  {book}
                  cover={view.covers.get(book.id) ?? null}
                  onremove={(id) => void view.remove(id)}
                  removing={view.removing === book.id}
                  onedit={(id) => (openSettingsFor = id)}
                  editing={view.editing === book.id}
                />
              </li>
            {/each}
            <li hidden={searching}>
              <UploadTile
                bind:this={tile}
                busy={view.busy}
                onfiles={(files) => void view.upload(files)}
              />
            </li>
          </ul>
        {/if}
      </div>
    </section>

    <Divider />

    <footer class="row wrap items-center gap-4 px-6 py-3 text-xs text-faint">
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
  </div>
</div>

{#if settingsBook !== null}
  <BookSettings
    book={settingsBook}
    saving={view.editing === settingsBook.id}
    onsave={(edit) => void save(settingsBook.id, edit)}
    onclose={() => (openSettingsFor = null)}
  />
{/if}
