<script lang="ts">
  import type { Snippet } from 'svelte';
  import { match } from 'ts-pattern';
  import { lockScrolling } from '$lib/platform/dom/scroll-lock';
  import type { Arrangement } from '$lib/shared/arrangement';
  import type { ImageIndex } from '$lib/shared/ids';
  import type { ImageRegion } from '$lib/shared/image-region';
  import {
    LAYOUT_KIND_CHOICES,
    LAYOUT_KIND_LEGEND_BRIEF,
    PAGE_PAIRING_CHOICES,
    PAGE_PAIRING_LEGEND_BRIEF,
    READING_DIRECTION_CHOICES,
    READING_DIRECTION_LEGEND_BRIEF,
  } from '$lib/shared/layout-choices';
  import ContinuousViewer from './ContinuousViewer.svelte';
  import { handlesOwnKeys } from './keyboard';
  import { moveOrder, type PageMove } from './page-moves';
  import PagedViewer from './PagedViewer.svelte';
  import { chromeShown } from './reader-chrome';
  import type { ReaderView } from './reader-view.svelte';

  type Props = {
    readonly view: ReaderView;
    readonly glow?: readonly ImageRegion[];
    readonly panel?: Snippet;
    readonly engine?: Snippet;
    readonly arrival?: Snippet;
    readonly onSelect?: (regions: readonly ImageRegion[], arrangement: Arrangement) => void;
  };

  type Turn = {
    readonly label: string;
    readonly enabled: boolean;
    readonly go: () => void;
  };

  type FitChoice = {
    readonly label: string;
    readonly ready: boolean;
    readonly active: boolean;
    readonly go: () => void;
  };

  type Place = {
    readonly marker: string;
    readonly of: number;
    readonly at: number;
  };

  let { view, glow = [], panel, engine, arrival, onSelect }: Props = $props();

  const uid = $props.id();

  const SIDEWAYS: readonly string[] = ['‹', '›'];
  const DOWNWARDS: readonly string[] = ['↑', '↓'];

  let paged = $state<ReturnType<typeof PagedViewer> | null>(null);
  let strip = $state<ReturnType<typeof ContinuousViewer> | null>(null);
  let topBar = $state<HTMLElement | null>(null);
  let bottomBar = $state<HTMLElement | null>(null);
  let topHeight = $state(0);
  let bottomHeight = $state(0);
  let chromeAsked = $state(false);
  let chromeHeld = $state(false);

  function popoverOpen(): boolean {
    try {
      return document.querySelector(':popover-open') !== null;
    } catch {
      return false;
    }
  }

  function holdsFocus(bar: HTMLElement | null, active: Element | null): boolean {
    if (bar === null || bar.inert || active === null) return false;

    return bar.contains(active);
  }

  function heldNow(): boolean {
    if (popoverOpen()) return true;

    const active = document.activeElement;

    return holdsFocus(topBar, active) || holdsFocus(bottomBar, active);
  }

  const chromeAwake = $derived(chromeShown(chromeAsked, chromeHeld));

  function toggleChrome(): void {
    chromeAsked = !chromeAwake;
  }

  const book = $derived(view.book);
  const total = $derived(book?.imageCount ?? 0);
  const rtl = $derived(view.direction === 'rtl');
  const groupCount = $derived(view.groups.length);
  const group = $derived(view.group);
  const renderer = $derived.by(() => {
    const kind = book?.layoutKind;
    if (kind === undefined) return null;

    return match(kind)
      .with('paged', () => 'paged' as const)
      .with('continuous', () => 'strip' as const)
      .exhaustive();
  });
  const downward = $derived(renderer === 'strip');
  const layout = $derived(book?.layoutKind ?? null);
  const pairing = $derived(book?.pagePairing ?? null);
  const direction = $derived(book?.direction ?? null);

  const stage = $derived(
    match(view.status)
      .with('idle', () => 'settling' as const)
      .with('loading', () => 'settling' as const)
      .with('missing', () => 'settling' as const)
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

  function commit(regions: readonly ImageRegion[], arrangement: Arrangement): void {
    view.select(regions);
    onSelect?.(regions, arrangement);
  }

  function page(index: ImageIndex): string {
    return String(index + 1).padStart(3, '0');
  }

  const canPrevious = $derived(stage === 'reading' && group > 0);
  const canNext = $derived(stage === 'reading' && group + 1 < groupCount);

  const forwardKey = $derived(rtl ? 'ArrowLeft' : 'ArrowRight');

  const place = $derived.by<Place>(() => {
    const kind = book?.layoutKind;
    if (kind === undefined) return { marker: `— / ${total}`, of: 0, at: 0 };

    return match(kind)
      .with('paged', () => ({
        marker:
          view.visiblePages.length === 0
            ? `— / ${total}`
            : `${view.visiblePages.map(page).join('–')} / ${total}`,
        of: groupCount,
        at: groupCount === 0 ? 0 : group + 1,
      }))
      .with('continuous', () => ({
        marker: total === 0 ? `— / ${total}` : `${page(view.position.index)} / ${total}`,
        of: total,
        at: total === 0 ? 0 : view.position.index + 1,
      }))
      .exhaustive();
  });

  const progress = $derived(place.of === 0 ? 0 : (place.at / place.of) * 100);

  const turns = $derived.by<Record<PageMove, Turn> | null>(() => {
    const kind = book?.layoutKind;
    if (kind === undefined) return null;

    return match(kind)
      .with('paged', () => ({
        decrement: {
          label: 'Previous page',
          enabled: canPrevious,
          go: () => void view.previous(),
        },
        increment: { label: 'Next page', enabled: canNext, go: () => void view.next() },
      }))
      .with('continuous', () => ({
        decrement: {
          label: 'Previous screen',
          enabled: stage === 'reading' && (strip?.canShift(-1) ?? false),
          go: () => strip?.shift(-1),
        },
        increment: {
          label: 'Next screen',
          enabled: stage === 'reading' && (strip?.canShift(1) ?? false),
          go: () => strip?.shift(1),
        },
      }))
      .exhaustive();
  });

  const order = $derived.by<readonly PageMove[]>(() => {
    const kind = book?.layoutKind;
    if (kind === undefined) return [];

    return moveOrder(kind, view.direction);
  });

  const glyphs = $derived(downward ? DOWNWARDS : SIDEWAYS);

  const fits = $derived.by<readonly FitChoice[]>(() => {
    const kind = book?.layoutKind;
    if (kind === undefined) return [];

    return match(kind)
      .with('paged', () => [
        {
          label: 'Fit height',
          ready: paged !== null,
          active: paged?.activeFit() === 'height',
          go: () => paged?.fitHeight(),
        },
        {
          label: 'Fit width',
          ready: paged !== null,
          active: paged?.activeFit() === 'width',
          go: () => paged?.fitWidth(),
        },
      ])
      .with('continuous', () => [
        {
          label: 'Fit width',
          ready: strip !== null,
          active: strip?.atFitWidth() ?? false,
          go: () => strip?.fitWidth(),
        },
      ])
      .exhaustive();
  });

  $effect(() => lockScrolling(document.documentElement));

  $effect(() => {
    function refresh(): void {
      chromeHeld = heldNow();
    }

    window.addEventListener('focusin', refresh);
    window.addEventListener('focusout', refresh);
    window.addEventListener('toggle', refresh, true);

    return () => {
      window.removeEventListener('focusin', refresh);
      window.removeEventListener('focusout', refresh);
      window.removeEventListener('toggle', refresh, true);
    };
  });

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (downward) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    if (handlesOwnKeys(event.target)) return;

    event.preventDefault();
    if (event.key === forwardKey) void view.next();
    else void view.previous();
  }
</script>

<svelte:window {onkeydown} />

<div class="screen">
  <header
    class="bar top"
    class:hushed={!chromeAwake}
    inert={!chromeAwake}
    bind:this={topBar}
    bind:offsetHeight={topHeight}
    style:margin-block-start="{chromeAwake ? 0 : -topHeight}px"
  >
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
        <fieldset class="group" disabled={view.saving}>
          <legend class="legend">{LAYOUT_KIND_LEGEND_BRIEF}</legend>
          {#each LAYOUT_KIND_CHOICES as choice (choice.value)}
            <label class="pill" title={choice.label}>
              <input
                type="radio"
                name="{uid}-layout"
                value={choice.value}
                checked={layout === choice.value}
                onchange={() => void view.setLayoutKind(choice.value)}
              />
              <span>{choice.brief}</span>
            </label>
          {/each}
        </fieldset>

        {#if engine !== undefined}
          <fieldset class="group">
            <legend class="legend">Engine</legend>
            {@render engine()}
          </fieldset>
        {/if}

        <fieldset class="group" disabled={view.saving || downward}>
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

        <fieldset class="group" disabled={view.saving || downward}>
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
          {#each fits as choice (choice.label)}
            <button
              class="fit"
              type="button"
              disabled={!choice.ready}
              aria-pressed={choice.active}
              onclick={choice.go}
            >
              {choice.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </header>

  {#if view.message !== null && stage === 'reading'}
    <p class="alert" role="alert">{view.message}</p>
  {/if}

  <div class="body">
    {#if curtain === null && book !== null && renderer === 'strip'}
      <ContinuousViewer
        bind:this={strip}
        sizes={view.sizes}
        start={view.position}
        imageAt={(index) => view.imageAt(index)}
        {glow}
        moveTo={(position) => view.moveTo(position)}
        select={(regions) => commit(regions, 'column')}
        clear={() => view.clearSelection()}
        onTap={toggleChrome}
      />
    {:else if curtain === null && book !== null}
      {#key book.id}
        <PagedViewer
          bind:this={paged}
          pages={view.visiblePages}
          direction={book.direction}
          pageFit={book.pageFit}
          imageAt={(index) => view.imageAt(index)}
          {glow}
          chromeShown={chromeAwake}
          select={(regions) => commit(regions, 'row')}
          clear={() => view.clearSelection()}
          onTap={toggleChrome}
          onFit={(fit) => void view.setPageFit(fit)}
        />
      {/key}
    {:else}
      <div class="curtain">
        <p class="notice" aria-live="polite">{curtain}</p>
        {#if stage === 'failed'}
          <a class="escape" href="/">Back to your library</a>
        {/if}
      </div>
    {/if}

    {#if chromeAwake}
      <div class="rail" role="group" aria-label="Reader controls">
        <a class="key" href="/">
          <span class="glyph" aria-hidden="true">⌂</span>
          <span class="assistive">Back to your library</span>
        </a>

        {#if turns !== null}
          <span class="parting"></span>

          {#each order as move, slot (move)}
            {@const turn = turns[move]}
            <button class="key" type="button" disabled={!turn.enabled} onclick={turn.go}>
              <span class="glyph" aria-hidden="true">{glyphs[slot]}</span>
              <span class="assistive">{turn.label}</span>
            </button>
          {/each}
        {/if}
      </div>
    {/if}

    {#if arrival !== undefined}
      <div class="arrived">{@render arrival()}</div>
    {/if}

    {#if panel !== undefined}
      <aside class="dock">{@render panel()}</aside>
    {/if}
  </div>

  <footer
    class="bar bottom"
    class:hushed={!chromeAwake}
    inert={!chromeAwake}
    bind:this={bottomBar}
    bind:offsetHeight={bottomHeight}
    style:margin-block-end="{chromeAwake ? 0 : -bottomHeight}px"
  >
    <p class="marker">{place.marker}</p>

    <div
      class="track"
      class:rtl
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={place.of}
      aria-valuenow={place.at}
      aria-valuetext={place.marker}
    >
      <span class="fill" style:width="{progress}%"></span>
    </div>
  </footer>
</div>

<style>
  .screen {
    --w-rail: 38px;

    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
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
    opacity: 1;
    transition:
      margin 200ms ease,
      opacity 200ms ease;
    background: var(--c-surface-chrome);
  }

  .bar.hushed {
    opacity: 0;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .bar {
      transition: none;
    }
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
    border-radius: var(--r-4);
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

  .alert {
    flex: none;
    margin: 0;
    padding: var(--s-2) var(--s-5);
    border-bottom: 1px solid var(--c-accent-border-soft);
    background: var(--c-accent-wash-faint);
    color: var(--c-text-3);
    font-size: 12px;
  }

  .body {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
  }

  .arrived {
    position: absolute;
    top: var(--s-4);
    left: calc(var(--s-3) * 2 + var(--w-rail));
    z-index: var(--z-chrome);
  }

  .rail {
    position: absolute;
    box-sizing: border-box;
    top: 50%;
    left: var(--s-3);
    z-index: var(--z-chrome);
    display: flex;
    flex-direction: column;
    gap: var(--s-1);
    width: var(--w-rail);
    padding: var(--s-1);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-pill);
    background: var(--c-surface-chrome);
    transform: translateY(-50%);
  }

  .key {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: var(--r-pill);
    background: transparent;
    color: var(--c-text-5);
    font-family: var(--f-ui);
    font-size: 14px;
    line-height: 1;
    text-decoration: none;
    cursor: pointer;
  }

  .key:hover:not(:disabled),
  .key:focus-visible {
    background: var(--c-surface-button);
    color: var(--c-accent);
  }

  .key:disabled {
    cursor: default;
    opacity: 0.4;
  }

  .parting {
    width: 14px;
    height: 1px;
    margin: var(--s-1) auto;
    background: var(--c-border-4);
  }

  .dock {
    display: flex;
    flex: none;
    width: 320px;
    min-height: 0;
    border-left: 1px solid var(--c-border-1);
    background: var(--c-surface-rail);
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
    border-radius: var(--r-4);
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

    .dock {
      width: 240px;
    }
  }
</style>
