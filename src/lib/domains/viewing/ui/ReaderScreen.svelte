<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { Component, Snippet } from 'svelte';
  import { match } from 'ts-pattern';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import IconButton from '$lib/ui/components/IconButton.svelte';
  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import ArrowDown from '$lib/ui/components/icons/ArrowDown.svelte';
  import ArrowUp from '$lib/ui/components/icons/ArrowUp.svelte';
  import ChevronLeft from '$lib/ui/components/icons/ChevronLeft.svelte';
  import ChevronRight from '$lib/ui/components/icons/ChevronRight.svelte';
  import type { IconProps } from '$lib/ui/components/icons/icon';
  import Pencil from '$lib/ui/components/icons/Pencil.svelte';
  import SearchIcon from '$lib/ui/components/icons/Search.svelte';
  import SquareDashedMousePointer from '$lib/ui/components/icons/SquareDashedMousePointer.svelte';
  import { mediaMatches } from '$lib/platform/dom/media-matches';
  import { lockScrolling } from '$lib/platform/dom/scroll-lock';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import type { Arrangement } from '$lib/shared/arrangement';
  import { shownTitle } from '$lib/shared/shown-title';
  import { chooseTouchTurns, touchTurns } from '$lib/shared/chosen-touch-turns.svelte';
  import { chooseEdgeClicksTurn, edgeClicksTurn } from '$lib/shared/edge-clicks.svelte';
  import { imageIndex } from '$lib/shared/ids';
  import type { GlowRegion, ImageRegion } from '$lib/shared/image-region';
  import { languageName } from '$lib/shared/language';
  import PageBar from '$lib/shared/PageBar.svelte';
  import { shownTurnSettings } from '$lib/shared/turn-settings';
  import type { ShownTurnSettings } from '$lib/shared/turn-settings';
  import { isNarrow } from '$lib/shared/panel-dock';
  import ReaderFrame from '$lib/shared/ReaderFrame.svelte';
  import { createBarsToggle, createPanelDock } from '$lib/shared/reader-frame.svelte';
  import { reportedScreen } from '$lib/shared/reader-frame-rules';
  import { dragOrigin, NOTE_MODE_LABEL, SELECT_MODE_LABELS } from './drag-mode';
  import { handlesOwnKeys } from './keyboard';
  import { moveOrder } from './page-moves';
  import type { PageMove } from './page-moves';
  import { readerStage, readingNotice } from './reader-opening';
  import type { ReaderView } from './reader-view.svelte';
  import ContinuousViewer from './ContinuousViewer.svelte';
  import ReaderBookData from './ReaderBookData.svelte';
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
    readonly panel?: Snippet<[boolean]>;
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
  let noting = $state(false);
  let selecting = $state(false);
  let settingsOpen = $state(false);
  let turnSettings = $state.raw<ShownTurnSettings>(presentTurnSettings());

  let bodyWidth = $state(0);
  let compactWidth = $state(0);
  let topBar = $state<HTMLElement | null>();
  let bottomBar = $state<HTMLElement | null>();

  const bars = createBarsToggle(() => [topBar, bottomBar]);
  const dock = createPanelDock();

  const shown = $derived(bars.shown);
  const makes = $derived(dragOrigin(noting));
  const narrow = $derived(isNarrow(bodyWidth, compactWidth));
  const screen = $derived(reportedScreen(bodyWidth, compactWidth));

  $effect(() => {
    if (screen !== null) untrack(() => view.fitScreen(screen));
  });
  $effect(() => {
    const groups = view.groups;
    untrack(() => view.keepShownThroughCurrent(groups));
  });
  const lit = $derived(shownGlow(glow, everyGlow, allCapturesWanted()));
  const touchGuide = $derived(paged?.offersGuide() ?? strip?.offersGuide() ?? false);

  function presentTurnSettings(): ShownTurnSettings {
    return shownTurnSettings(mediaMatches);
  }

  function openSettings(): void {
    turnSettings = presentTurnSettings();
    settingsOpen = true;
  }

  function toggleChrome(): void {
    bars.toggle(document.activeElement, paged?.surface() ?? strip?.surface() ?? null);
  }

  const book = $derived(view.book);
  const total = $derived(book?.imageCount ?? 0);
  const groupCount = $derived(view.groups.length);
  const group = $derived(view.group);
  const layout = $derived(view.layout);
  const downward = $derived(layout === 'continuous');
  const forwardKey = $derived(view.direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight');

  const stage = $derived(readerStage(view.opening));
  const warning = $derived(readingNotice(view.opening));

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
    view.selection.select(regions);
    if (panel !== undefined) dock.afterCapture(narrow);
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
  {dock}
  {shown}
  onfocuschange={bars.refresh}
  bind:bodyWidth
  bind:compactWidth
  bind:topBar
  bind:bottomBar
  class="reader-screen"
  pageClass="col gap-0"
  {panel}
  {panelCount}
>
  {#snippet notice()}
    {#if warning !== null}
      <Alert variant="warning" role="alert" class="shrink-0">{warning}</Alert>
    {/if}
  {/snippet}

  {#snippet page()}
    <ReaderBookData opening={view.opening}>
      {#snippet children(ready)}
        {#if layout === 'continuous'}
          <ContinuousViewer
            bind:this={strip}
            sizes={view.sizes.sizes}
            start={view.position}
            pictureAt={(index) => view.pictureAt(index)}
            measured={(index, size) => view.measure(index, size)}
            glow={lit}
            {makes}
            chromeShown={shown}
            {selecting}
            moveTo={(position, shownThrough) => view.moveTo(position, shownThrough)}
            select={(regions) => commit(regions, 'column')}
            clear={() => view.selection.clear()}
            onTap={toggleChrome}
          />
        {:else}
          {#key ready.book.id}
            <PagedViewer
              bind:this={paged}
              pages={view.visiblePages}
              beside={view.besidePages}
              direction={ready.book.direction}
              pageFit={ready.book.pageFit}
              pictureAt={(index) => view.pictureAt(index)}
              measured={(index, size) => view.measure(index, size)}
              glow={lit}
              {makes}
              chromeShown={shown}
              {selecting}
              turns={touchTurns()}
              edgeClicksTurn={edgeClicksTurn()}
              select={(regions) => commit(regions, 'row')}
              clear={() => view.selection.clear()}
              onTap={toggleChrome}
              onFit={(fit) => void view.setPageFit(fit)}
              onTurn={turnTowards}
            />
          {/key}
        {/if}
      {/snippet}
    </ReaderBookData>

    {#if arrival !== undefined}
      <div class="callout-top-start z-sticky">{@render arrival()}</div>
    {/if}
  {/snippet}

  {#snippet header()}
    <PageHeader
      backHref="/"
      backLabel="Library"
      compact={narrow}
      title={book === null ? 'Reader' : shownTitle(book)}
      lang={book?.language ?? 'en'}
      {meta}
    />

    {#if book !== null}
      <IconButton
        hint
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
          hint
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
          hint
          size="sm"
          class="shrink-0"
          aria-haspopup="dialog"
          icon={SearchIcon}
          label={SEARCH_BOOK_LABEL}
          onclick={onsearch}
        />
      {/if}

      <Button size="sm" class="shrink-0" aria-haspopup="dialog" onclick={openSettings}>
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
  saving={view.preferences.saving}
  {downward}
  {fits}
  offersAppearance={narrow}
  {turnSettings}
  touchTurns={touchTurns()}
  ontouchturns={chooseTouchTurns}
  edgeClicksTurn={edgeClicksTurn()}
  onedgeclicksturn={chooseEdgeClicksTurn}
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
