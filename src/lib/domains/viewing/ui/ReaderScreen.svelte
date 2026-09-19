<script lang="ts">
  import { match } from 'ts-pattern';
  import type { ImageIndex } from '$lib/shared/ids';
  import PagedViewer from './PagedViewer.svelte';
  import type { ReaderView } from './reader-view.svelte';

  type Props = { readonly view: ReaderView };

  let { view }: Props = $props();

  const book = $derived(view.book);
  const total = $derived(book?.imageCount ?? 0);
  const rtl = $derived(book?.direction === 'rtl');
  const groupCount = $derived(view.groups.length);
  const group = $derived(view.group);

  const stage = $derived(
    match(view.status)
      .with('idle', () => 'settling' as const)
      .with('loading', () => 'settling' as const)
      .with('ready', () => 'reading' as const)
      .with('empty', () => 'empty' as const)
      .with('failed', () => 'failed' as const)
      .exhaustive(),
  );

  const curtain = $derived(
    match(stage)
      .with('settling', () => 'Opening the book…')
      .with('reading', () => null)
      .with('empty', () => 'This book holds no pages to show.')
      .with('failed', () => view.message ?? 'This book could not be opened.')
      .exhaustive(),
  );

  const pairing = $derived(
    book === null
      ? null
      : match(book.pagePairing)
          .with('single', () => 'single pages')
          .with('double', () => 'two-page spreads')
          .with('double-after-cover', () => 'two-page spreads after the cover')
          .exhaustive(),
  );

  const meta = $derived(
    book === null
      ? ''
      : [
          `${total} images`,
          pairing,
          book.direction === 'rtl' ? 'right to left' : 'left to right',
          book.language === 'ko' ? 'Korean' : 'Japanese',
        ]
          .filter((part) => part !== null)
          .join(' · '),
  );

  function page(index: ImageIndex): string {
    return String(index + 1).padStart(3, '0');
  }

  const marker = $derived(
    view.visiblePages.length === 0
      ? `— / ${total}`
      : `${view.visiblePages.map(page).join('–')} / ${total}`,
  );

  const progress = $derived(groupCount === 0 ? 0 : ((group + 1) / groupCount) * 100);
  const canPrevious = $derived(stage === 'reading' && group > 0);
  const canNext = $derived(stage === 'reading' && group + 1 < groupCount);

  const rightToLeft = $derived(book?.direction === 'rtl');
  const forwardKey = $derived(rightToLeft ? 'ArrowLeft' : 'ArrowRight');
  const backGlyph = $derived(rightToLeft ? '›' : '‹');
  const forwardGlyph = $derived(rightToLeft ? '‹' : '›');

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;

    const target = event.target;
    if (target instanceof HTMLElement && target.isContentEditable) return;

    event.preventDefault();
    if (event.key === forwardKey) void view.next();
    else void view.previous();
  }
</script>

<svelte:window {onkeydown} />

<div class="screen">
  <header class="bar top">
    <a class="back" href="/">
      <span class="glyph" aria-hidden="true">‹</span>
      Library
    </a>
    <div class="heading">
      <h1 class="title" class:ko={book?.language === 'ko'} lang={book?.language ?? 'en'}>
        {book?.title ?? 'Reader'}
      </h1>
      <p class="meta">{meta}</p>
    </div>
  </header>

  {#if view.message !== null && stage === 'reading'}
    <p class="alert" role="alert">{view.message}</p>
  {/if}

  {#if curtain === null && book !== null}
    <PagedViewer
      pages={view.visiblePages}
      direction={book.direction}
      imageAt={(index) => view.imageAt(index)}
    />
  {:else}
    <div class="curtain">
      <p class="notice" aria-live="polite">{curtain}</p>
      {#if stage === 'failed'}
        <a class="escape" href="/">Back to your library</a>
      {/if}
    </div>
  {/if}

  <footer class="bar bottom">
    <p class="marker">{marker}</p>

    <div class="moves">
      <button
        class="move"
        type="button"
        disabled={!canPrevious}
        onclick={() => void view.previous()}
      >
        <span class="glyph" aria-hidden="true">{backGlyph}</span>
        <span class="assistive">Previous page</span>
      </button>
      <button class="move" type="button" disabled={!canNext} onclick={() => void view.next()}>
        <span class="glyph" aria-hidden="true">{forwardGlyph}</span>
        <span class="assistive">Next page</span>
      </button>
    </div>

    <div
      class="track"
      class:rtl
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={groupCount}
      aria-valuenow={groupCount === 0 ? 0 : group + 1}
      aria-valuetext={marker}
    >
      <span class="fill" style:width="{progress}%"></span>
    </div>
  </footer>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--c-surface-app);
    color: var(--c-text-2);
    font-family: var(--f-ui);
  }

  .bar {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--s-4);
    padding: var(--s-3) var(--s-5);
    background: var(--c-surface-chrome);
  }

  .top {
    border-bottom: 1px solid var(--c-border-1);
  }

  .bottom {
    border-top: 1px solid var(--c-border-1);
  }

  .back {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--s-1);
    padding: var(--s-1) var(--s-2);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-md);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-size: 11.5px;
    text-decoration: none;
  }

  .back:hover,
  .back:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .heading {
    flex: 1 1 auto;
    min-width: 0;
  }

  .title {
    margin: 0;
    overflow: hidden;
    color: var(--c-text-1);
    font-family: var(--f-ja);
    font-size: 15px;
    font-weight: 400;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title.ko {
    font-family: var(--f-ko);
  }

  .meta {
    margin: var(--s-1) 0 0;
    color: var(--c-text-8);
    font-size: 11px;
  }

  .alert {
    flex: none;
    margin: 0;
    padding: var(--s-2) var(--s-5);
    border-bottom: 1px solid var(--c-accent-border-soft);
    background: var(--c-accent-wash-faint);
    color: var(--c-text-3);
    font-size: 12px;
  }

  .curtain {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-3);
    min-height: 0;
    padding: var(--s-5);
    background: var(--c-viewer-gradient);
  }

  .notice {
    margin: 0;
    color: var(--c-text-7);
    font-size: 12.5px;
    text-align: center;
  }

  .escape {
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-md);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
  }

  .marker {
    flex: none;
    margin: 0;
    color: var(--c-text-5);
    font-family: var(--f-mono);
    font-size: 11px;
    letter-spacing: 0.02em;
  }

  .moves {
    display: flex;
    flex: none;
    gap: var(--s-1);
  }

  .move {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-md);
    background: var(--c-surface-button);
    color: var(--c-text-4);
    font-family: var(--f-ui);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
  }

  .move:hover:not(:disabled),
  .move:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .move:disabled {
    cursor: default;
    opacity: 0.4;
  }

  .glyph {
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

  .track {
    position: relative;
    flex: 1 1 auto;
    height: 3px;
    min-width: 0;
    overflow: hidden;
    border-radius: var(--r-pill);
    background: var(--c-border-2);
  }

  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    display: block;
    background: var(--c-accent);
  }

  .track.rtl .fill {
    right: 0;
    left: auto;
  }

  @media (max-width: 700px) {
    .bar {
      padding: var(--s-3) var(--s-4);
    }
  }
</style>
