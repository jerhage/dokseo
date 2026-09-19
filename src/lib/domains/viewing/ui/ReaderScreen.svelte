<script lang="ts">
  import { match } from 'ts-pattern';
  import type { ImageIndex } from '$lib/shared/ids';
  import {
    CONTINUOUS_HAS_NO_PAIRS,
    CONTINUOUS_READS_DOWNWARD,
    PAGE_PAIRING_CHOICES,
    PAGE_PAIRING_LEGEND_BRIEF,
    READING_DIRECTION_CHOICES,
    READING_DIRECTION_LEGEND_BRIEF,
  } from '$lib/shared/layout-choices';
  import { handlesOwnKeys } from './keyboard';
  import PagedViewer from './PagedViewer.svelte';
  import type { ReaderView } from './reader-view.svelte';

  type Props = { readonly view: ReaderView };

  let { view }: Props = $props();

  const uid = $props.id();

  let viewer = $state<ReturnType<typeof PagedViewer> | null>(null);

  const book = $derived(view.book);
  const total = $derived(book?.imageCount ?? 0);
  const rtl = $derived(book?.direction === 'rtl');
  const groupCount = $derived(view.groups.length);
  const group = $derived(view.group);
  const downward = $derived(book?.layoutKind === 'continuous');
  const pairing = $derived(book?.pagePairing ?? null);
  const direction = $derived(book?.direction ?? null);

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

  const meta = $derived(
    book === null ? '' : `${total} images · ${book.language === 'ko' ? 'Korean' : 'Japanese'}`,
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
  const leftMove = $derived(
    rightToLeft
      ? { label: 'Next page', enabled: canNext, go: () => void view.next() }
      : { label: 'Previous page', enabled: canPrevious, go: () => void view.previous() },
  );
  const rightMove = $derived(
    rightToLeft
      ? { label: 'Previous page', enabled: canPrevious, go: () => void view.previous() }
      : { label: 'Next page', enabled: canNext, go: () => void view.next() },
  );

  const fit = $derived(viewer?.activeFit() ?? null);

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    if (handlesOwnKeys(event.target)) return;

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

    {#if book !== null}
      <div class="settings">
        <fieldset
          class="group"
          disabled={view.saving || downward}
          aria-describedby={downward ? `${uid}-unpaired` : undefined}
        >
          <legend class="legend">{PAGE_PAIRING_LEGEND_BRIEF}</legend>
          {#each PAGE_PAIRING_CHOICES as choice (choice.value)}
            <label class="pill" title={choice.label}>
              <input
                type="radio"
                name="{uid}-pairing"
                value={choice.value}
                checked={pairing === choice.value}
                onchange={() => void view.setPairing(choice.value)}
              />
              <span>{choice.brief}</span>
            </label>
          {/each}
        </fieldset>

        <fieldset
          class="group"
          disabled={view.saving || downward}
          aria-describedby={downward ? `${uid}-downward` : undefined}
        >
          <legend class="legend">{READING_DIRECTION_LEGEND_BRIEF}</legend>
          {#each READING_DIRECTION_CHOICES as choice (choice.value)}
            <label class="pill" title={choice.label}>
              <input
                type="radio"
                name="{uid}-direction"
                value={choice.value}
                checked={direction === choice.value}
                onchange={() => void view.setDirection(choice.value)}
              />
              <span>{choice.brief}</span>
            </label>
          {/each}
        </fieldset>

        <div class="group" role="group" aria-labelledby="{uid}-fit">
          <span class="legend" id="{uid}-fit">Fit</span>
          <button
            class="fit"
            type="button"
            disabled={viewer === null}
            aria-pressed={fit === 'height'}
            onclick={() => viewer?.fitHeight()}
          >
            Fit height
          </button>
          <button
            class="fit"
            type="button"
            disabled={viewer === null}
            aria-pressed={fit === 'width'}
            onclick={() => viewer?.fitWidth()}
          >
            Fit width
          </button>
        </div>

        {#if downward}
          <p class="hint" id="{uid}-unpaired">{CONTINUOUS_HAS_NO_PAIRS}</p>
          <p class="hint" id="{uid}-downward">{CONTINUOUS_READS_DOWNWARD}</p>
        {/if}
      </div>
    {/if}
  </header>

  {#if view.message !== null && stage === 'reading'}
    <p class="alert" role="alert">{view.message}</p>
  {/if}

  {#if curtain === null && book !== null}
    <PagedViewer
      bind:this={viewer}
      pages={view.visiblePages}
      direction={book.direction}
      imageAt={(index) => view.imageAt(index)}
      select={(regions) => view.select(regions)}
      clear={() => view.clearSelection()}
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
      <button class="move" type="button" disabled={!leftMove.enabled} onclick={leftMove.go}>
        <span class="glyph" aria-hidden="true">‹</span>
        <span class="assistive">{leftMove.label}</span>
      </button>
      <button class="move" type="button" disabled={!rightMove.enabled} onclick={rightMove.go}>
        <span class="glyph" aria-hidden="true">›</span>
        <span class="assistive">{rightMove.label}</span>
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

  .settings {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--s-2) var(--s-4);
  }

  .group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-1);
    margin: 0;
    padding: 0;
    border: 0;
  }

  .group:disabled {
    opacity: 0.5;
  }

  .legend {
    flex: 1 0 100%;
    padding: 0;
    color: var(--c-text-8);
    font-family: var(--f-ui);
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .pill {
    position: relative;
    padding: var(--s-1) var(--s-2);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-pill);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-size: 11px;
    white-space: nowrap;
  }

  .pill input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .group:not(:disabled) .pill {
    cursor: pointer;
  }

  .group:not(:disabled) .pill:hover {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .pill:has(input:checked) {
    border-color: var(--c-accent-border);
    background: var(--c-accent-wash-soft);
    color: var(--c-accent);
  }

  .pill:has(input:focus-visible) {
    outline: 1px solid var(--c-accent-border-strong);
    outline-offset: 1px;
  }

  .fit {
    padding: var(--s-1) var(--s-2);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-pill);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-family: var(--f-ui);
    font-size: 11px;
    white-space: nowrap;
    cursor: pointer;
  }

  .fit:hover:not(:disabled),
  .fit:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .fit[aria-pressed='true'] {
    border-color: var(--c-accent-border);
    background: var(--c-accent-wash-soft);
    color: var(--c-accent);
  }

  .fit:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .hint {
    flex: 1 0 100%;
    margin: 0;
    color: var(--c-text-9);
    font-size: 10.5px;
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
