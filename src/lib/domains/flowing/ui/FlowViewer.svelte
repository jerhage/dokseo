<script lang="ts">
  import { tick, untrack } from 'svelte';
  import type { Component, Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { match } from 'ts-pattern';
  import { relayKeydownsTo } from '$lib/platform/dom/key-relay';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import IconButton from '$lib/components/IconButton.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
  import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
  import type { IconProps } from '$lib/components/icons/icon';
  import type { Language } from '$lib/shared/language';
  import Pencil from '$lib/components/icons/Pencil.svelte';
  import SearchIcon from '$lib/components/icons/Search.svelte';
  import type { Anchor } from '$lib/shared/anchor';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import LessonScrim from '$lib/shared/LessonScrim.svelte';
  import PageBar from '$lib/shared/PageBar.svelte';
  import ReaderFrame from '$lib/shared/ReaderFrame.svelte';
  import { FOCUSED_OR_OPEN, ReaderFrameView } from '$lib/shared/reader-frame.svelte';
  import SwipeLine from '$lib/shared/SwipeLine.svelte';
  import { TouchGuide } from '$lib/shared/touch-guide.svelte';
  import { RememberedChoice } from '$lib/shared/remembered-choice.svelte';
  import { readTouchTurns, saveTouchTurns } from '$lib/shared/touch-turns';
  import { TEXT_SETTINGS_LABEL } from '../domain/reading-settings';
  import type { ReadingSettings } from '../domain/reading-settings';
  import { CONTENTS_LABEL, NO_CONTENTS_LABEL } from './flow-contents';
  import type { ContentsEntry } from './flow-contents';
  import { NO_ANCHORS, passageCfis } from './flow-highlight';
  import { FlowGestures } from './flow-gestures';
  import { keyTarget } from './flow-keys';
  import { flowGuideKind, flowInput, flowSwipeLesson, offersFlowGuide } from './flow-hint';
  import { flowMeta, tickOffsets } from './flow-progress';
  import { liftMetrics } from './flow-lift';
  import type { LiftedPassage } from './flow-lift';
  import { LiftOffer } from './lift-offer.svelte';
  import type { LiftStage } from './lift-offer.svelte';
  import { forgetSelection, selectedPassage, shownSelection } from './flow-passage';
  import { openFlowSurface } from './flow-surface';
  import type { ChapterView } from './flow-surface';
  import {
    dismissesTheArrival,
    FRAME_NOWHERE_ON_THE_STAGE,
    HOST_VIEWPORT_ORIGIN,
    isTyping,
    pressesOnSpace,
    tapOnStage,
    turnOrder,
  } from './flow-turn';
  import type { FlowAction, FlowTurn, Point, StageTap } from './flow-turn';
  import type { FlowBook, FlowView } from './flow-view.svelte';
  import FlowContentsDialog from './FlowContentsDialog.svelte';
  import FlowSettingsDialog from './FlowSettingsDialog.svelte';
  import PageInkProbe from './PageInkProbe.svelte';
  import { flowScrub, scrubbedFractionAt, scrubMarker } from './flow-scrub';
  import './flow-viewer.css';

  type Props = {
    readonly view: FlowView;
    readonly book: FlowBook;
    readonly panel?: Snippet<[boolean]>;
    readonly arrival?: Snippet;
    readonly panelCount?: number;
    readonly anchors?: readonly Anchor[];
    readonly onLift?: (passage: LiftedPassage) => void;
    readonly onsearch?: (() => void) | undefined;
    readonly saving?: boolean;
    readonly onlanguage?: ((language: Language) => void) | undefined;
  };

  const {
    view,
    book,
    panel,
    arrival,
    panelCount,
    anchors = NO_ANCHORS,
    onLift,
    onsearch,
    saving = false,
    onlanguage,
  }: Props = $props();

  const LIFT_LABEL = 'Save this passage as a capture';
  const SEARCH_BOOK_LABEL = 'Search this book';

  const touchTurns = new RememberedChoice(readTouchTurns, saveTouchTurns);

  const ICONS: readonly Component<IconProps>[] = [ChevronLeft, ChevronRight];

  const TURN_LABELS: Readonly<Record<FlowTurn, string>> = {
    previous: 'Previous page',
    next: 'Next page',
  };

  let stage = $state<HTMLElement | null>(null);
  let contentsOpen = $state(false);
  let contentsDialog = $state<ReturnType<typeof FlowContentsDialog> | null>(null);
  let settingsOpen = $state(false);
  let gestures: FlowGestures | null = null;
  let lastPointerType = $state<string | null>(null);
  const lift = new LiftOffer<ChapterView>({
    stage: liftStage,
    selection: (chapter) => shownSelection(chapter.doc),
    origin: (chapter) => frameOrigin(chapter.doc),
  });
  const touchGuide = new TouchGuide(() => flowGuideKind(view.paging));
  const chapters = new Set<Document>();
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const curtain = $derived(view.curtain);
  const message = $derived(curtain.kind === 'notice' ? curtain.message : null);
  const dialogOpen = $derived(contentsOpen || settingsOpen);
  const reading = $derived(view.state.kind === 'ready');
  const contents = $derived(view.contents);
  const settings = $derived(view.settings);
  const progress = $derived(view.progress);
  const scrub = $derived(flowScrub(progress));
  const meta = $derived(flowMeta(view.chapter, book.language));
  const turning = $derived(view.direction);
  const marks = $derived(tickOffsets(view.ticks, turning));
  const passages = $derived(passageCfis(anchors));
  const readerFrame = new ReaderFrameView(FOCUSED_OR_OPEN, () => dialogOpen);
  const narrow = $derived(readerFrame.narrow);
  const turns = $derived(
    turnOrder(turning).map((turn, slot) => ({
      icon: ICONS[slot] ?? ChevronRight,
      label: TURN_LABELS[turn],
      enabled: reading,
      go: () => view.turn(turn),
    })),
  );

  const awake = $derived(readerFrame.barsShown);

  const input = $derived(flowInput(lastPointerType, coarse));
  const guideOffered = $derived(offersFlowGuide({ open: reading, input }));
  const guideShown = $derived(touchGuide.shownWhen(guideOffered));
  const guideLesson = $derived(flowSwipeLesson(view.paging));

  function armGuide(): void {
    if (!reading) return;

    touchGuide.open();
  }

  function textSelected(): boolean {
    for (const doc of [document, ...chapters]) {
      const selection = doc.getSelection();
      if (selection !== null && selection.rangeCount > 0 && !selection.isCollapsed) return true;
    }

    return false;
  }

  async function showContents(): Promise<void> {
    contentsOpen = true;
    await tick();
    contentsDialog?.revealCurrent();
  }

  function pickEntry(entry: ContentsEntry): void {
    view.jumpTo(entry);
  }

  function chooseSettings(chosen: ReadingSettings): void {
    view.restyle(chosen);
  }

  function onkey(event: KeyboardEvent): void {
    if (event.defaultPrevented || dialogOpen || gestures === null) return;

    if (event.key === 'Escape' && lift.dismiss()) {
      event.preventDefault();
      return;
    }

    if (event.key === 'Escape' && view.arrivalStanding) {
      view.dismissArrival();
      event.preventDefault();
      return;
    }

    const pressed = keyTarget(event.target);
    const move = gestures.keyed({
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      typing: isTyping(pressed),
      pressesOnSpace: pressesOnSpace(pressed),
    });
    if (move.kind !== 'stay') event.preventDefault();
  }

  function apply(action: FlowAction): void {
    if (dismissesTheArrival(action)) view.dismissArrival();

    match(action)
      .with({ kind: 'nothing' }, () => undefined)
      .with({ kind: 'turn' }, () => undefined)
      .with({ kind: 'chrome' }, () => {
        readerFrame.toggleBars(document.activeElement, stage);
      })
      .exhaustive();
  }

  function press(event: PointerEvent, spot: StageTap): void {
    lift.press();
    lastPointerType = event.pointerType;
    gestures?.pressed({
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      at: spot.at,
    });
  }

  function release(event: PointerEvent, spot: StageTap): void {
    const action = gestures?.released({
      pointerId: event.pointerId,
      at: spot.at,
      width: spot.width,
      textSelected: textSelected(),
      turns: touchTurns.value,
      chromeShown: awake,
    });
    lift.release();
    if (action !== undefined) apply(action);
  }

  function cancel(event: PointerEvent): void {
    gestures?.cancelled(event.pointerId);
    lift.release();
  }

  function frameOrigin(doc: Document): Point {
    const frame = doc.defaultView?.frameElement;
    if (frame === null || frame === undefined) return FRAME_NOWHERE_ON_THE_STAGE;

    const box = frame.getBoundingClientRect();
    return { x: box.left, y: box.top };
  }

  function spotOn(host: HTMLElement, event: PointerEvent, origin: Point): StageTap {
    const box = host.getBoundingClientRect();
    return tapOnStage({ x: event.clientX, y: event.clientY }, origin, {
      left: box.left,
      top: box.top,
      width: box.width,
    });
  }

  function liftStage(): LiftStage | null {
    const host = stage;
    if (host === null) return null;

    return {
      box: () => host.getBoundingClientRect(),
      metrics: () => liftMetrics(getComputedStyle(host)),
    };
  }

  function takeLift(): void {
    const held = lift.take();
    if (held === null) return;

    const passage = selectedPassage(
      held.chapter.doc,
      held.chapter.index,
      held.chapter.cfis,
      held.chapter.titles,
    );
    for (const doc of chapters) forgetSelection(doc);
    if (passage === null) return;

    if (panel !== undefined) readerFrame.panelAfterCapture();
    onLift?.(passage);
  }

  function markerAt(step: number): string {
    return scrubMarker(progress, step);
  }

  function scrubTo(step: number): void {
    view.seek(scrubbedFractionAt(step));
  }

  function bind(host: HTMLElement, chapter: ChapterView): void {
    const doc = chapter.doc;
    gestures ??= new FlowGestures(chapter.pages);
    chapters.add(doc);
    lift.show(chapter);

    doc.addEventListener('keydown', onkey);
    relayKeydownsTo(window, doc);
    doc.addEventListener('selectionchange', () => lift.ask());
    doc.addEventListener('pointerdown', (event) =>
      press(event, spotOn(host, event, frameOrigin(doc))),
    );
    doc.addEventListener('pointerup', (event) =>
      release(event, spotOn(host, event, frameOrigin(doc))),
    );
    doc.addEventListener('pointercancel', cancel);
  }

  $effect(() => {
    view.markPassages(passages);
  });

  const openOnStage: Attachment<HTMLDivElement> = (host) => {
    void book.id;
    const held = untrack(() => book);

    const began = (event: PointerEvent): void =>
      press(event, spotOn(host, event, HOST_VIEWPORT_ORIGIN));
    const ended = (event: PointerEvent): void =>
      release(event, spotOn(host, event, HOST_VIEWPORT_ORIGIN));

    host.addEventListener('pointerdown', began);
    host.addEventListener('pointerup', ended);
    host.addEventListener('pointercancel', cancel);

    void view
      .open(
        held,
        (opening) => openFlowSurface(host, opening, (chapter) => bind(host, chapter)),
        () => lift.ask(),
      )
      .then(armGuide);
    return () => {
      host.removeEventListener('pointerdown', began);
      host.removeEventListener('pointerup', ended);
      host.removeEventListener('pointercancel', cancel);
      view.close();
      lift.close();
      gestures = null;
      touchGuide.close();
      contentsOpen = false;
      settingsOpen = false;
      chapters.clear();
    };
  };
</script>

<svelte:window onkeydown={onkey} />

<ReaderFrame
  frame={readerFrame}
  shown={awake}
  class="flow-viewer"
  pageClass="layout-overlay-bare"
  {panel}
  {panelCount}
>
  {#snippet page()}
    <div class="stage min-h-0" tabindex="-1" bind:this={stage} {@attach openOnStage}></div>

    <PageInkProbe onink={(ink) => view.paint(ink)} />

    {#if lift.offer !== null}
      <div
        class="lift place-rect z-overlay"
        style:--rect-left="{lift.offer.left}px"
        style:--rect-top="{lift.offer.top}px"
      >
        <IconButton
          variant="accent"
          pill
          class="lift-button"
          icon={Pencil}
          label={LIFT_LABEL}
          tooltip={false}
          onclick={takeLift}
        />
      </div>
    {/if}

    {#if arrival !== undefined}
      <div class="callout-top-start z-sticky">{@render arrival()}</div>
    {/if}

    {#if guideShown}
      <LessonScrim
        class="row items-center justify-center px-4 text-center"
        ondismiss={() => touchGuide.dismiss()}
      >
        <SwipeLine lesson={guideLesson} />
      </LessonScrim>
    {/if}
  {/snippet}

  {#snippet header()}
    <PageHeader backHref="/" backLabel="Library" title={book.title} lang={book.language} {meta} />

    {#if reading}
      {#if contents.kind === 'listed'}
        <Button
          size="sm"
          class="shrink-0"
          aria-haspopup="dialog"
          onclick={() => void showContents()}
        >
          {CONTENTS_LABEL}
        </Button>
      {:else}
        <p class="text-xs text-faint shrink-0">{NO_CONTENTS_LABEL}</p>
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
        {TEXT_SETTINGS_LABEL}
      </Button>
    {/if}

    {#if !narrow}
      <AppearanceSwitcher />
    {/if}
  {/snippet}

  {#snippet footer()}
    <PageBar
      first={turns[0] ?? null}
      second={turns[1] ?? null}
      steps={scrub.steps}
      at={scrub.at}
      direction={turning}
      enabled={reading}
      label="Reading progress"
      ticks={marks}
      {markerAt}
      onscrub={scrubTo}
    />
  {/snippet}

  {#snippet overlay()}
    {#if view.notice !== null}
      <div class="callout-top-center z-sticky">
        <Alert dismissLabel="Hide this message" ondismiss={() => view.dismissNotice()}>
          {view.notice}
        </Alert>
      </div>
    {/if}

    {#if curtain.kind === 'opening'}
      <EmptyState
        variant="fill"
        live
        message="Opening this book…"
        class="layout-overlay-fill z-overlay surface-bg text-center"
      />
    {:else if message !== null}
      <EmptyState
        variant="fill"
        live
        {message}
        class="layout-overlay-fill z-overlay surface-bg text-center"
      >
        {#snippet action()}
          <Button href="/" variant="primary" size="sm">Back to your library</Button>
        {/snippet}
      </EmptyState>
    {/if}
  {/snippet}
</ReaderFrame>

{#if contents.kind === 'listed'}
  <FlowContentsDialog
    bind:this={contentsDialog}
    bind:open={contentsOpen}
    entries={contents.entries}
    language={book.language}
    currentKey={view.currentKey}
    onpick={pickEntry}
  />
{/if}

<FlowSettingsDialog
  bind:open={settingsOpen}
  {settings}
  offersAppearance={narrow}
  onchoose={chooseSettings}
  language={book.language}
  {saving}
  {onlanguage}
  touchGuide={guideOffered}
  ontouchguide={() => touchGuide.recall()}
/>
