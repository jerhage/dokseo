<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component, Snippet } from 'svelte';
  import { match } from 'ts-pattern';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import IconButton from '$lib/components/IconButton.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import ArrowDown from '$lib/components/icons/ArrowDown.svelte';
  import ArrowUp from '$lib/components/icons/ArrowUp.svelte';
  import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
  import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
  import type { IconProps } from '$lib/components/icons/icon';
  import Pencil from '$lib/components/icons/Pencil.svelte';
  import SearchIcon from '$lib/components/icons/Search.svelte';
  import SquareDashedMousePointer from '$lib/components/icons/SquareDashedMousePointer.svelte';
  import { lockScrolling } from '$lib/platform/dom/scroll-lock';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import type { Arrangement } from '$lib/shared/arrangement';
  import { imageIndex } from '$lib/shared/ids';
  import type { GlowRegion, ImageRegion } from '$lib/shared/image-region';
  import { languageName } from '$lib/shared/language';
  import PageBar from '$lib/shared/PageBar.svelte';
  import type { TouchTurns } from '$lib/shared/page-turn';
  import { readTouchTurns, saveTouchTurns } from '$lib/shared/touch-turns';
  import { chromeShown } from '$lib/shared/reader-chrome';
  import ReaderFrame from '$lib/shared/ReaderFrame.svelte';
  import { ReaderFrameView } from '$lib/shared/reader-frame.svelte';
  import { dragOrigin, NOTE_MODE_LABEL, SELECT_MODE_LABELS } from './drag-mode';
  import { FLOWING_TEXT_NOTICE } from './flow-notice';
  import { handlesOwnKeys } from './keyboard';
  import { moveOrder } from './page-moves';
  import type { PageMove } from './page-moves';
  import type { ReaderView } from './reader-view.svelte';
  import ContinuousViewer from './ContinuousViewer.svelte';
  import PagedViewer from './PagedViewer.svelte';
  import { scrubPlace, stepMarker } from './page-scrubber';
  import type { ScrubSource } from './page-scrubber';
  import { chooseHints, hintsWanted } from './learned-gestures.svelte';
  import { allCapturesWanted, chooseAllCaptures } from './all-captures.svelte';
  import { shownGlow } from './page-glow';
  import ReaderSettings from './ReaderSettings.svelte';
  import './reader-screen.css';

  type Props = {
    readonly view: ReaderView;
    readonly glow?: readonly GlowRegion[];
    readonly everyGlow?: readonly GlowRegion[];
    readonly panel?: Snippet;
    readonly panelCount?: number;
    readonly engine?: Snippet;
    readonly arrival?: Snippet;
    readonly onSelect?: (regions: readonly ImageRegion[], arrangement: Arrangement) => void;
    readonly onNote?: (regions: readonly ImageRegion[]) => void;
    readonly onsearch?: (() => void) | undefined;
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

  let {
    view,
    glow = [],
    everyGlow = [],
    panel,
    panelCount,
    engine,
    arrival,
    onSelect,
    onNote,
    onsearch,
  }: Props = $props();

  const SIDEWAYS: readonly [Component<IconProps>, Component<IconProps>] = [
    ChevronLeft,
    ChevronRight,
  ];
  const DOWNWARDS: readonly [Component<IconProps>, Component<IconProps>] = [ArrowUp, ArrowDown];
  const SEARCH_BOOK_LABEL = 'Search this book';

  let paged = $state<ReturnType<typeof PagedViewer> | null>(null);
  let strip = $state<ReturnType<typeof ContinuousViewer> | null>(null);
  let asked = $state(false);
  let noting = $state(false);
  let selecting = $state(false);
  let touchTurns = $state<TouchTurns>(readTouchTurns());
  let settingsOpen = $state(false);

  const readerFrame = new ReaderFrameView();

  const shown = $derived(chromeShown(asked, readerFrame.focus.held));
  const makes = $derived(dragOrigin(noting));
  const narrow = $derived(readerFrame.narrow);
  const lit = $derived(shownGlow(glow, everyGlow, allCapturesWanted()));
  const touchGuide = $derived(paged?.offersGuide() ?? strip?.offersGuide() ?? false);

  function toggleChrome(): void {
    if (shown) {
      readerFrame.releaseBars(document.activeElement, paged?.surface() ?? strip?.surface() ?? null);
    }
    asked = !shown;
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
    if (panel !== undefined) readerFrame.panelAfterCapture();
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

  function turnTowards(move: PageMove): void {
    const turn = turns?.[move];
    if (turn !== undefined && turn.enabled) turn.go();
  }

  function chooseTouchTurns(chosen: TouchTurns): void {
    touchTurns = chosen;
    saveTouchTurns(chosen);
  }

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

  onMount(() => lockScrolling(document.documentElement));

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

<ReaderFrame
  frame={readerFrame}
  {shown}
  class="reader-screen"
  pageClass="col gap-0"
  {panel}
  {panelCount}
>
  {#snippet notice()}
    {#if view.message !== null && stage === 'reading'}
      <Alert variant="warning" role="alert" class="shrink-0">{view.message}</Alert>
    {/if}
  {/snippet}

  {#snippet page()}
    {#if curtain === null && book !== null && layout === 'continuous'}
      <ContinuousViewer
        bind:this={strip}
        sizes={view.sizes}
        start={view.position}
        pictureAt={(index) => view.pictureAt(index)}
        measured={(index, size) => view.measure(index, size)}
        glow={lit}
        {makes}
        chromeShown={shown}
        {selecting}
        moveTo={(position, shownThrough) => view.moveTo(position, shownThrough)}
        select={(regions) => commit(regions, 'column')}
        clear={() => view.clearSelection()}
        onTap={toggleChrome}
      />
    {:else if curtain === null && book !== null}
      {#key book.id}
        <PagedViewer
          bind:this={paged}
          pages={view.visiblePages}
          beside={view.besidePages}
          direction={book.direction}
          pageFit={book.pageFit}
          pictureAt={(index) => view.pictureAt(index)}
          measured={(index, size) => view.measure(index, size)}
          glow={lit}
          {makes}
          chromeShown={shown}
          {selecting}
          turns={touchTurns}
          select={(regions) => commit(regions, 'row')}
          clear={() => view.clearSelection()}
          onTap={toggleChrome}
          onFit={(fit) => void view.setPageFit(fit)}
          onTurn={turnTowards}
        />
      {/key}
    {:else}
      <EmptyState
        variant="fill"
        live
        message={curtain ?? ''}
        class="flex-1 min-h-0 scheme-dark surface-sunken"
      >
        {#snippet action()}
          {#if stage === 'failed'}
            <Button href="/" variant="primary" size="sm">Back to your library</Button>
          {/if}
        {/snippet}
      </EmptyState>
    {/if}

    {#if arrival !== undefined}
      <div class="callout-top-start z-sticky">{@render arrival()}</div>
    {/if}
  {/snippet}

  {#snippet header()}
    <PageHeader
      backHref="/"
      backLabel="Library"
      compact={narrow}
      title={book?.title ?? 'Reader'}
      lang={book?.language ?? 'en'}
      {meta}
    />

    {#if book !== null}
      <IconButton
        variant={noting ? 'accent' : 'default'}
        size="sm"
        class="shrink-0"
        aria-pressed={noting}
        icon={Pencil}
        label={NOTE_MODE_LABEL}
        onclick={() => (noting = !noting)}
      />

      {#if layout !== null}
        <IconButton
          variant={selecting ? 'accent' : 'default'}
          size="sm"
          class="shrink-0"
          aria-pressed={selecting}
          icon={SquareDashedMousePointer}
          label={SELECT_MODE_LABELS[layout]}
          onclick={() => (selecting = !selecting)}
        />
      {/if}

      {#if onsearch !== undefined}
        <IconButton
          size="sm"
          class="shrink-0"
          aria-haspopup="dialog"
          icon={SearchIcon}
          label={SEARCH_BOOK_LABEL}
          onclick={onsearch}
        />
      {/if}

      <Button
        size="sm"
        class="shrink-0"
        aria-haspopup="dialog"
        onclick={() => (settingsOpen = true)}
      >
        Settings
      </Button>

      {#if !narrow}
        {@render engine?.()}
      {/if}
    {/if}

    {#if !narrow}
      <AppearanceSwitcher />
    {/if}
  {/snippet}

  {#snippet footer()}
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
  {/snippet}
</ReaderFrame>

<ReaderSettings
  bind:open={settingsOpen}
  language={book?.language ?? null}
  {layout}
  pairing={book?.pagePairing ?? null}
  direction={book?.direction ?? null}
  saving={view.saving}
  {downward}
  {fits}
  offersAppearance={narrow}
  {touchTurns}
  ontouchturns={chooseTouchTurns}
  gestureHints={hintsWanted()}
  ongesturehints={chooseHints}
  {touchGuide}
  ontouchguide={() => (paged ?? strip)?.showGuide()}
  allCaptures={allCapturesWanted()}
  onallcaptures={chooseAllCaptures}
  onlanguage={(language) => void view.setLanguage(language)}
  onlayout={(kind) => void view.setLayoutKind(kind)}
  onpairing={(pairing) => void view.setPairing(pairing)}
  ondirection={(direction) => void view.setDirection(direction)}
/>
