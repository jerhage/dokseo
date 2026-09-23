<script lang="ts">
  import type { BookId } from '$lib/shared/ids';
  import { matchesQuery } from '$lib/shared/text-search';
  import type { BookEdit } from '../domain/book/book';
  import { describeLibraryContents, libraryContents } from '../domain/book/book-contents';
  import BookCard from './BookCard.svelte';
  import BookSettings from './BookSettings.svelte';
  import PendingCard from './PendingCard.svelte';
  import { DROP_INVITATION } from './accepted-formats';
  import LibrarySearch from './LibrarySearch.svelte';
  import UploadTile from './UploadTile.svelte';
  import type { LibraryView } from './library-view.svelte';

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

  const SOURCE_URL = 'https://github.com/jerhage/dokseo';

  const SOURCE_LABEL = 'The source of this app, on GitHub';

  const GITHUB_MARK =
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 ' +
    '0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 ' +
    '17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 ' +
    '1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465' +
    '-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 ' +
    '3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 ' +
    '3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 ' +
    '1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627' +
    '-5.373-12-12-12';

  const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

  function formatBytes(bytes: number): string {
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < UNITS.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toFixed(unit > 0 && size < 10 ? 1 : 0)} ${UNITS[unit]}`;
  }

  const searching = $derived(query.trim().length > 0);
  const titled = $derived(
    searching ? view.books.filter((book) => matchesQuery(book.title, query)) : view.books,
  );
  const space = $derived(
    view.storedBytes === null
      ? 'upload size unknown'
      : `${formatBytes(view.storedBytes)} of uploads`,
  );
  const contents = $derived(describeLibraryContents(libraryContents(view.books)));
  const summary = $derived(`${contents} · ${space}`);
  const settling = $derived(view.status !== 'ready' && view.status !== 'failed');
  const matched = $derived(`${titled.length} ${titled.length === 1 ? 'title' : 'titles'}`);
</script>

<div class="screen">
  <nav class="rail" aria-label="Sections">
    <span class="mark" lang="ja" aria-hidden="true">読</span>
    <a class="settings tags" href="/tags" title="Tags across your documents">
      <span aria-hidden="true">#</span>
      <span class="assistive">Tags</span>
    </a>
    <span class="grow"></span>
    <a class="settings" href="/settings" title="OCR engine settings">
      <span aria-hidden="true">⚙</span>
      <span class="assistive">Settings</span>
    </a>
  </nav>

  <div class="main">
    <header class="head">
      <div class="heading">
        <h1>Your uploads</h1>
        <p class="summary">{summary}</p>
      </div>
      <div class="tools">
        <LibrarySearch bind:query {matched} label="Filter these titles" />
        <span class="quick">⌘K to search everything</span>
        <button
          class="upload"
          type="button"
          disabled={view.busy || tile === null}
          onclick={() => tile?.choose()}
        >
          {view.busy ? 'Adding…' : 'Upload pages'}
        </button>
      </div>
    </header>

    <section class="body">
      {#if notice !== null}
        <p class="alert" role="alert">{notice}</p>
      {/if}

      {#if view.message !== null}
        <p class="alert" role="alert">{view.message}</p>
      {/if}

      {#if settling && view.books.length === 0 && view.pending === null}
        <p class="notice" aria-live="polite">Reading your library…</p>
      {:else}
        {#if view.status === 'failed'}
          <p class="notice">
            <span>Your library could not be read.</span>
            <button class="retry" type="button" onclick={() => void view.load()}>Try again</button>
          </p>
        {:else if view.books.length === 0 && view.pending === null}
          <p class="notice">No uploads yet. {DROP_INVITATION.toLowerCase()} to start.</p>
        {/if}

        <ul class="grid">
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
    </section>

    <footer class="foot">
      {#if view.pending !== null}
        <span class="uploads" aria-live="polite">1 upload in progress</span>
      {/if}
      <span class="space">{space}</span>
      <a class="source" href={SOURCE_URL} target="_blank" rel="noreferrer" title={SOURCE_LABEL}>
        <svg class="octocat" viewBox="0 0 24 24" aria-hidden="true"><path d={GITHUB_MARK} /></svg>
        <span class="assistive">{SOURCE_LABEL}</span>
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
    width: 62px;
    padding: var(--s-4) 0;
    border-right: 1px solid var(--c-border-1);
    background: var(--c-surface-rail);
  }

  .grow {
    flex: 1 1 auto;
  }

  .settings {
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

  .settings:hover,
  .settings:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .tags {
    margin-top: var(--s-2);
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
  }

  .main {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .head {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--s-4);
    padding: var(--s-5) var(--s-6) var(--s-4);
    border-bottom: 1px solid var(--c-border-1);
  }

  .heading {
    flex: 1 1 auto;
    min-width: 0;
  }

  h1 {
    margin: 0;
    color: var(--c-text-1);
    font-size: 20px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  .summary {
    margin: var(--s-1) 0 0;
    color: var(--c-text-8);
    font-size: 11.5px;
  }

  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2);
  }

  .quick {
    color: var(--c-text-10);
    font-family: var(--f-mono);
    font-size: 10.5px;
    white-space: nowrap;
  }

  .assistive {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .upload {
    padding: var(--s-2) var(--s-3);
    border: 0;
    border-radius: var(--r-4);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-family: var(--f-ui);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .upload:disabled {
    cursor: progress;
    opacity: 0.6;
  }

  .body {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: var(--s-5) var(--s-6);
  }

  .alert {
    margin: 0 0 var(--s-4);
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-accent-border-soft);
    border-radius: var(--r-4);
    background: var(--c-accent-wash-faint);
    color: var(--c-text-3);
    font-size: 12px;
  }

  .notice {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    margin: 0 0 var(--s-4);
    color: var(--c-text-8);
    font-size: 12px;
  }

  .retry {
    padding: var(--s-1) var(--s-2);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-1);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-family: var(--f-ui);
    font-size: 11.5px;
    cursor: pointer;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--s-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .foot {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-4);
    padding: var(--s-3) var(--s-6);
    border-top: 1px solid var(--c-border-1);
    color: var(--c-text-9);
    font-size: 11px;
  }

  .uploads {
    color: var(--c-accent);
  }

  .space {
    margin-left: auto;
  }

  .source {
    display: flex;
    align-items: center;
    color: var(--c-text-3);
  }

  .source:hover,
  .source:focus-visible {
    color: var(--c-text-1);
  }

  .octocat {
    width: 15px;
    height: 15px;
    fill: currentcolor;
  }

  @media (max-width: 1180px) {
    .grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 940px) {
    .grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .head,
    .body,
    .foot {
      padding-right: var(--s-4);
      padding-left: var(--s-4);
    }
  }

  @media (max-width: 460px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
