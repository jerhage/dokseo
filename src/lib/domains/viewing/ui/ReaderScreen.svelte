<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import { match } from 'ts-pattern';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import ArrowDown from '$lib/components/icons/ArrowDown.svelte';
  import ArrowUp from '$lib/components/icons/ArrowUp.svelte';
  import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
  import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
  import type { IconProps } from '$lib/components/icons/icon';
  import Pencil from '$lib/components/icons/Pencil.svelte';
  import { lockScrolling } from '$lib/platform/dom/scroll-lock';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import type { Arrangement } from '$lib/shared/arrangement';
  import { ChromeFocus } from '$lib/shared/chrome-focus.svelte';
  import { imageIndex } from '$lib/shared/ids';
  import type { GlowRegion, ImageRegion } from '$lib/shared/image-region';
  import { languageName } from '$lib/shared/language';
  import { chromeShown } from '$lib/shared/reader-chrome';
  import { dragOrigin, NOTE_MODE_LABEL } from './drag-mode';
  import { FLOWING_TEXT_NOTICE } from './flow-notice';
  import { handlesOwnKeys } from './keyboard';
  import { moveOrder } from './page-moves';
  import type { PageMove } from './page-moves';
  import type { ReaderView } from './reader-view.svelte';
  import ContinuousViewer from './ContinuousViewer.svelte';
  import PagedViewer from './PagedViewer.svelte';
  import PageBar from './PageBar.svelte';
  import { dockPlacement, dockToggle, isNarrow } from './panel-dock';
  import PanelDock from './PanelDock.svelte';
  import { scrubPlace, stepMarker } from './page-scrubber';
  import type { ScrubSource } from './page-scrubber';
  import ReaderSettings from './ReaderSettings.svelte';
  import { returnFocusToPage } from './reading-surface';
  import './reader-screen.css';

  type Props = {
    readonly view: ReaderView;
    readonly glow?: readonly GlowRegion[];
    readonly panel?: Snippet;
    readonly panelCount?: number;
    readonly engine?: Snippet;
    readonly arrival?: Snippet;
    readonly onSelect?: (regions: readonly ImageRegion[], arrangement: Arrangement) => void;
    readonly onNote?: (regions: readonly ImageRegion[]) => void;
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

  let { view, glow = [], panel, panelCount, engine, arrival, onSelect, onNote }: Props = $props();

  const SIDEWAYS: readonly [Component<IconProps>, Component<IconProps>] = [
    ChevronLeft,
    ChevronRight,
  ];
  const DOWNWARDS: readonly [Component<IconProps>, Component<IconProps>] = [ArrowUp, ArrowDown];

  let paged = $state<ReturnType<typeof PagedViewer> | null>(null);
  let strip = $state<ReturnType<typeof ContinuousViewer> | null>(null);
  let topBar = $state<HTMLElement | null>(null);
  let bottomBar = $state<HTMLElement | null>(null);
  let topHeight = $state(0);
  let bottomHeight = $state(0);
  let bodyWidth = $state(0);
  let compactWidth = $state(0);
  let asked = $state(false);
  let noting = $state(false);
  let settingsOpen = $state(false);
  let panelAsked = $state<boolean | null>(null);

  function openPopovers(): readonly Element[] {
    try {
      return [...document.querySelectorAll(':popover-open')];
    } catch {
      return [];
    }
  }

  const focus = new ChromeFocus(
    () => [topBar, bottomBar],
    () => [document.activeElement, ...openPopovers()],
  );

  const shown = $derived(chromeShown(asked, focus.held));
  const makes = $derived(dragOrigin(noting));
  const narrow = $derived(isNarrow(bodyWidth, compactWidth));
  const placement = $derived(dockPlacement(narrow, panelAsked));
  const panelOpen = $derived(dockToggle(placement).open);

  function releaseBars(): void {
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement)) return;
    returnFocusToPage(focused, [topBar, bottomBar], paged?.surface() ?? strip?.surface() ?? null);
  }

  function toggleChrome(): void {
    if (shown) releaseBars();
    asked = !shown;
  }

  function togglePanel(): void {
    panelAsked = !panelOpen;
  }

  const book = $derived(view.book);
  const total = $derived(book?.imageCount ?? 0);
  const groupCount = $derived(view.groups.length);
  const group = $derived(view.group);
  const layout = $derived(view.layout);
  const downward = $derived(layout === 'continuous');
  const forwardKey = $derived(view.direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight');

  const stage = $derived(
    match(view.status)
      .with('idle', () => 'settling' as const)
      .with('loading', () => 'settling' as const)
      .with('missing', () => 'settling' as const)
      .with('ready', () => 'reading' as const)
      .with('empty', () => 'empty' as const)
      .with('failed', () => 'failed' as const)
      .with('flow', () => 'flowing' as const)
      .exhaustive(),
  );

  const curtain = $derived(
    match(stage)
      .with('settling', () => 'Opening the book…')
      .with('reading', () => null)
      .with('empty', () => 'This book holds no pages to show.')
      .with('failed', () => view.message ?? 'This book could not be opened.')
      .with('flowing', () => FLOWING_TEXT_NOTICE)
      .exhaustive(),
  );

  const meta = $derived(book === null ? '' : `${total} images · ${languageName(book.language)}`);

  const source = $derived<ScrubSource | null>(
    layout === null
      ? null
      : {
          layout,
          groups: view.groups,
          group,
          index: view.position.index,
          total,
        },
  );

  const place = $derived(source === null ? { steps: 0, at: 0 } : scrubPlace(source));

  function markerAt(step: number): string {
    return source === null ? `— / ${total}` : stepMarker(source, step);
  }

  function scrubTo(step: number): void {
    const opened = book;
    if (opened === null || layout === null) return;

    match(layout)
      .with('paged', () => void view.goToGroup(step))
      .with('continuous', () => void view.goToImage(opened.id, imageIndex(step)))
      .exhaustive();
  }

  function commit(regions: readonly ImageRegion[], arrangement: Arrangement): void {
    view.select(regions);
    if (panel !== undefined) panelAsked = true;
    if (makes === 'written') onNote?.(regions);
    else onSelect?.(regions, arrangement);
  }

  const turns = $derived.by<Record<PageMove, Turn> | null>(() => {
    if (layout === null) return null;

    return match(layout)
      .with('paged', () => ({
        decrement: {
          label: 'Previous page',
          enabled: stage === 'reading' && group > 0,
          go: () => void view.previous(),
        },
        increment: {
          label: 'Next page',
          enabled: stage === 'reading' && group + 1 < groupCount,
          go: () => void view.next(),
        },
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

  const shownTurns = $derived.by(() => {
    const all = turns;
    if (all === null || layout === null) return [null, null];

    const [before, after] = downward ? DOWNWARDS : SIDEWAYS;
    return moveOrder(layout, view.direction).map((move, slot) => {
      const turn = all[move];
      const icon = slot === 0 ? before : after;
      return { label: turn.label, enabled: turn.enabled, go: turn.go, icon };
    });
  });

  const fits = $derived.by<readonly FitChoice[]>(() => {
    if (layout === null) return [];

    return match(layout)
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
      focus.refresh();
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

<div class="reader-screen col gap-0 h-screen overflow-hidden surface-bg">
  {#if view.message !== null && stage === 'reading'}
    <Alert variant="warning" role="alert" class="shrink-0">{view.message}</Alert>
  {/if}

  <div
    class={['body relative gap-0 flex-1 min-h-0 overflow-hidden', narrow ? 'col' : 'row']}
    bind:clientWidth={bodyWidth}
  >
    <div class="compact-probe" aria-hidden="true" bind:clientWidth={compactWidth}></div>

    <div
      class="page relative col gap-0 flex-1 min-h-0 overflow-hidden"
      style:--chrome-top="{shown ? topHeight : 0}px"
      style:--chrome-bottom="{shown ? bottomHeight : 0}px"
    >
      {#if curtain === null && book !== null && layout === 'continuous'}
        <ContinuousViewer
          bind:this={strip}
          sizes={view.sizes}
          start={view.position}
          pictureAt={(index) => view.pictureAt(index)}
          measured={(index, size) => view.measure(index, size)}
          {glow}
          {makes}
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
            pictureAt={(index) => view.pictureAt(index)}
            measured={(index, size) => view.measure(index, size)}
            {glow}
            {makes}
            chromeShown={shown}
            select={(regions) => commit(regions, 'row')}
            clear={() => view.clearSelection()}
            onTap={toggleChrome}
            onFit={(fit) => void view.setPageFit(fit)}
          />
        {/key}
      {:else}
        <div
          class="col items-center justify-center gap-3 flex-1 min-h-0 p-5 scheme-dark surface-sunken"
        >
          <p class="prose text-sm text-muted" aria-live="polite">{curtain}</p>
          {#if stage === 'failed'}
            <Button href="/" variant="primary" size="sm">Back to your library</Button>
          {/if}
        </div>
      {/if}

      {#if arrival !== undefined}
        <div class="arrived">{@render arrival()}</div>
      {/if}

      <header
        class={[
          'pin-top z-sticky row wrap items-center gap-2 px-responsive py-2 surface border-b shadow-sm hushable',
          { 'is-hushed': !shown },
        ]}
        inert={!shown}
        bind:this={topBar}
        bind:offsetHeight={topHeight}
      >
        <Button href="/" size="sm" class="shrink-0">
          <ChevronLeft class="btn-icon" />
          Library
        </Button>

        <div class="col gap-0 flex-1">
          <h1 class="text-base weight-medium truncate" lang={book?.language ?? 'en'}>
            {book?.title ?? 'Reader'}
          </h1>
          <p class="text-xs text-faint truncate">{meta}</p>
        </div>

        {#if book !== null}
          <Button
            variant={noting ? 'accent' : 'default'}
            size="sm"
            square
            class="shrink-0"
            aria-pressed={noting}
            title={NOTE_MODE_LABEL}
            onclick={() => (noting = !noting)}
          >
            <Pencil class="btn-icon" />
            <span class="visually-hidden">{NOTE_MODE_LABEL}</span>
          </Button>

          <Button
            size="sm"
            class="shrink-0"
            aria-haspopup="dialog"
            onclick={() => (settingsOpen = true)}
          >
            Settings
          </Button>

          {@render engine?.()}
        {/if}

        {#if !narrow}
          <AppearanceSwitcher />
        {/if}
      </header>

      <footer
        class={[
          'pin-bottom z-sticky row items-center gap-2 px-responsive py-2 surface border-t hushable',
          { 'is-hushed': !shown },
        ]}
        inert={!shown}
        bind:this={bottomBar}
        bind:offsetHeight={bottomHeight}
      >
        <PageBar
          first={shownTurns[0] ?? null}
          second={shownTurns[1] ?? null}
          steps={place.steps}
          at={place.at}
          direction={view.direction}
          enabled={stage === 'reading'}
          {markerAt}
          onscrub={scrubTo}
        />
      </footer>
    </div>

    {#if panel !== undefined}
      <PanelDock {placement} count={panelCount ?? null} {panel} ontoggle={togglePanel} />
    {/if}
  </div>
</div>

<ReaderSettings
  bind:open={settingsOpen}
  {layout}
  pairing={book?.pagePairing ?? null}
  direction={book?.direction ?? null}
  saving={view.saving}
  {downward}
  {fits}
  offersAppearance={narrow}
  onlayout={(kind) => void view.setLayoutKind(kind)}
  onpairing={(pairing) => void view.setPairing(pairing)}
  ondirection={(direction) => void view.setDirection(direction)}
/>
