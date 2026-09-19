<script lang="ts">
  import type { BookId } from '$lib/shared/ids';
  import type { BookEdit } from '../domain/book';
  import BookCard from './BookCard.svelte';
  import BookSettings from './BookSettings.svelte';
  import PendingCard from './PendingCard.svelte';
  import { DROP_INVITATION } from './accepted-formats';
  import UploadTile from './UploadTile.svelte';
  import type { LibraryView } from './library-view.svelte';

  type Props = { readonly view: LibraryView };

  let { view }: Props = $props();

  let tile = $state<ReturnType<typeof UploadTile> | null>(null);
  let openSettingsFor = $state<BookId | null>(null);

  const settingsBook = $derived(view.books.find((book) => book.id === openSettingsFor) ?? null);

  async function save(id: BookId, edit: BookEdit): Promise<void> {
    await view.edit(id, edit);
    openSettingsFor = null;
  }

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

  const totalImages = $derived(view.books.reduce((sum, book) => sum + book.imageCount, 0));
  const space = $derived(
    view.usage === null ? 'space unknown' : `${formatBytes(view.usage.usage)} stored locally`,
  );
  const summary = $derived(
    `${view.books.length} series · ${totalImages.toLocaleString()} images · ${space}`,
  );
  const settling = $derived(view.status !== 'ready' && view.status !== 'failed');
</script>

<div class="screen">
  <div class="rail">
    <span class="mark" lang="ja" aria-hidden="true">読</span>
  </div>

  <div class="main">
    <header class="head">
      <div class="heading">
        <h1>Your uploads</h1>
        <p class="summary">{summary}</p>
      </div>
      <div class="tools">
        <label class="search" for="library-search">
          <span class="assistive">Search titles or recognized text</span>
          <input id="library-search" type="search" placeholder="Search titles or recognized text" />
        </label>
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
            <li>
              <PendingCard title={view.pending} language="ja" />
            </li>
          {/if}
          {#each view.books as book (book.id)}
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
          <li>
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
      <span>OCR engine: local · manga-ocr</span>
      <span class="space">{space}</span>
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
    min-height: 100vh;
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

  .mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: var(--r-md);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-family: var(--f-ja);
    font-size: 15px;
  }

  .main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
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

  .search {
    display: block;
  }

  .assistive {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .search input {
    width: 230px;
    max-width: 100%;
    height: 32px;
    padding: 0 var(--s-3);
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-md);
    background: var(--c-surface-popover);
    color: var(--c-text-3);
    font-family: var(--f-ui);
    font-size: 11.5px;
  }

  .search input::placeholder {
    color: var(--c-text-10);
  }

  .search input:focus-visible {
    border-color: var(--c-accent-border);
    outline: none;
  }

  .upload {
    padding: var(--s-2) var(--s-3);
    border: 0;
    border-radius: var(--r-md);
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
    flex: 1;
    min-height: 0;
    padding: var(--s-5) var(--s-6);
  }

  .alert {
    margin: 0 0 var(--s-4);
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-accent-border-soft);
    border-radius: var(--r-md);
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
    border-radius: var(--r-sm);
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

  .space {
    margin-left: auto;
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

    .search input {
      width: 100%;
    }
  }
</style>
