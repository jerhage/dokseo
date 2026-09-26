<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import { match } from 'ts-pattern';
  import { relayKeydownsTo } from '$lib/platform/dom/key-relay';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
  import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
  import type { IconProps } from '$lib/components/icons/icon';
  import Pencil from '$lib/components/icons/Pencil.svelte';
  import type { Anchor } from '$lib/shared/anchor';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import { ChromeFocus } from '$lib/shared/chrome-focus.svelte';
  import CompactProbe from '$lib/shared/CompactProbe.svelte';
  import PageBar from '$lib/shared/PageBar.svelte';
  import { dockPlacement, dockToggle, isNarrow } from '$lib/shared/panel-dock';
  import PanelDock from '$lib/shared/PanelDock.svelte';
  import { chromeShown } from '$lib/shared/reader-chrome';
  import { returnFocusToPage } from '$lib/shared/reading-surface';
  import { TEXT_SETTINGS_LABEL } from '../../../domain/reading-settings';
  import type { ReadingSettings } from '../../../domain/reading-settings';
  import { CONTENTS_LABEL, NO_CONTENTS_LABEL } from '../../flow-contents';
  import type { ContentsEntry } from '../../flow-contents';
  import { NO_ANCHORS, passageCfis } from '../../flow-highlight';
  import { FlowGestures } from '../../flow-gestures';
  import { flowMeta, tickOffsets } from '../../flow-progress';
  import {
    LIFT_BUTTON_HEIGHT_PX,
    LIFT_BUTTON_WIDTH_PX,
    liftPlacement,
    offerMove,
    rectOnStage,
  } from '../../flow-lift';
  import type { LiftPlacement, LiftRect, LiftedPassage } from '../../flow-lift';
  import { forgetSelection, selectedPassage, shownSelection } from '../../flow-passage';
  import { openFlowSurface } from '../../flow-surface';
  import type { ChapterView } from '../../flow-surface';
  import {
    dismissesTheArrival,
    FRAME_NOWHERE_ON_THE_STAGE,
    HOST_VIEWPORT_ORIGIN,
    isTyping,
    pressesOnSpace,
    tapOnStage,
    turnOrder,
  } from '../../flow-turn';
  import type { FlowAction, FlowTurn, KeyTarget, Point, StageTap } from '../../flow-turn';
  import type { FlowBook, FlowView } from '../../flow-view.svelte';
  import FlowContentsDialog from '../FlowContentsDialog.svelte';
  import FlowSettingsDialog from '../FlowSettingsDialog.svelte';
  import PageInkProbe from '../PageInkProbe.svelte';
  import { flowScrub, scrubbedFractionAt, scrubMarker } from './flow-scrub';
  import './flow-viewer.css';

  type ScreenFill = 'screen' | 'parent';

  type Props = {
    readonly view: FlowView;
    readonly book: FlowBook;
    readonly fill?: ScreenFill;
    readonly panel?: Snippet;
    readonly panelCount?: number;
    readonly anchors?: readonly Anchor[];
    readonly onLift?: (passage: LiftedPassage) => void;
  };

  type LiftOffer = {
    readonly chapter: ChapterView;
    readonly left: number;
    readonly top: number;
  };

  const {
    view,
    book,
    fill = 'screen',
    panel,
    panelCount,
    anchors = NO_ANCHORS,
    onLift,
  }: Props = $props();

  const LIFT_LABEL = 'Save this passage as a capture';

  const ICONS: readonly Component<IconProps>[] = [ChevronLeft, ChevronRight];

  const TURN_LABELS: Readonly<Record<FlowTurn, string>> = {
    previous: 'Previous page',
    next: 'Next page',
  };

  let stage = $state<HTMLElement | null>(null);
  let topBar = $state<HTMLElement | null>(null);
  let bottomBar = $state<HTMLElement | null>(null);
  let topHeight = $state(0);
  let bodyWidth = $state(0);
  let compactWidth = $state(0);
  let barsAsked = $state(true);
  let panelAsked = $state<boolean | null>(null);
  let contentsOpen = $state(false);
  let settingsOpen = $state(false);
  let gestures: FlowGestures | null = null;
  let offer = $state.raw<LiftOffer | null>(null);
  let showing: ChapterView | null = null;
  let pointerHeld = false;
  let queued: number | null = null;
  const chapters = new Set<Document>();

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
  const reported = $derived(view.location);
  const passages = $derived(passageCfis(anchors));
  const narrow = $derived(isNarrow(bodyWidth, compactWidth));
  const placement = $derived(dockPlacement(narrow, panelAsked));
  const panelOpen = $derived(dockToggle(placement).open);
  const turns = $derived(
    turnOrder(turning).map((turn, slot) => ({
      icon: ICONS[slot] ?? ChevronRight,
      label: TURN_LABELS[turn],
      enabled: reading,
      go: () => view.turn(turn),
    })),
  );

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

  const awake = $derived(chromeShown(barsAsked, focus.held || dialogOpen));

  function releaseBars(): void {
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement)) return;
    returnFocusToPage(focused, [topBar, bottomBar], stage);
  }

  function toggleBars(): void {
    if (awake) releaseBars();
    barsAsked = !awake;
  }

  function togglePanel(): void {
    panelAsked = !panelOpen;
  }

  function isEditable(target: EventTarget): boolean {
    if (!('isContentEditable' in target)) return false;

    const editable = target.isContentEditable;
    return typeof editable === 'boolean' && editable;
  }

  function controlType(target: EventTarget): string | null {
    if (!('type' in target)) return null;

    const kind = target.type;
    return typeof kind === 'string' ? kind : null;
  }

  function controlRole(target: EventTarget): string | null {
    if (!('role' in target)) return null;

    const named = target.role;
    return typeof named === 'string' ? named : null;
  }

  function keyTarget(target: EventTarget | null): KeyTarget | null {
    if (target === null) return null;
    if (!('tagName' in target)) return null;

    const tagName = target.tagName;
    if (typeof tagName !== 'string') return null;

    return {
      tagName,
      type: controlType(target),
      role: controlRole(target),
      editable: isEditable(target),
    };
  }

  function textSelected(): boolean {
    for (const doc of [document, ...chapters]) {
      const selection = doc.getSelection();
      if (selection !== null && selection.rangeCount > 0 && !selection.isCollapsed) return true;
    }

    return false;
  }

  function pickEntry(entry: ContentsEntry): void {
    view.jumpTo(entry);
  }

  function chooseSettings(chosen: ReadingSettings): void {
    view.restyle(chosen);
  }

  function onkey(event: KeyboardEvent): void {
    if (event.defaultPrevented || dialogOpen || gestures === null) return;

    if (event.key === 'Escape' && offer !== null) {
      offer = null;
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
        toggleBars();
      })
      .exhaustive();
  }

  function press(event: PointerEvent, spot: StageTap): void {
    offer = null;
    pointerHeld = true;
    gestures?.pressed({
      pointerId: event.pointerId,
      at: spot.at,
    });
  }

  function release(event: PointerEvent, spot: StageTap): void {
    const action = gestures?.released({
      pointerId: event.pointerId,
      at: spot.at,
      width: spot.width,
      textSelected: textSelected(),
    });
    pointerHeld = false;
    askAboutTheOffer();
    if (action !== undefined) apply(action);
  }

  function cancel(event: PointerEvent): void {
    gestures?.cancelled(event.pointerId);
    pointerHeld = false;
    askAboutTheOffer();
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

  function spotOfferedAt(placed: LiftPlacement): Omit<LiftOffer, 'chapter'> | null {
    return match(placed)
      .with({ kind: 'nowhere' }, () => null)
      .with({ kind: 'above' }, (above) => ({ left: above.left, top: above.top }))
      .with({ kind: 'below' }, (below) => ({ left: below.left, top: below.top }))
      .exhaustive();
  }

  function placedOffer(
    host: HTMLElement,
    chapter: ChapterView,
    rects: readonly LiftRect[],
  ): LiftOffer | null {
    const box = host.getBoundingClientRect();
    const origin = frameOrigin(chapter.doc);
    const onScreen = { left: box.left, top: box.top, width: box.width };
    const placed = rects.map((rect) => rectOnStage(rect, origin, onScreen));
    const spot = spotOfferedAt(liftPlacement(placed, { width: box.width, height: box.height }));

    return spot === null ? null : { chapter, ...spot };
  }

  function followTheSelection(): void {
    const host = stage;
    const chapter = showing;
    if (host === null || chapter === null) {
      offer = null;
      return;
    }

    const rects = shownSelection(chapter.doc);
    match(offerMove({ selected: rects.length > 0, pointerHeld }))
      .with({ kind: 'keep' }, () => undefined)
      .with({ kind: 'clear' }, () => {
        offer = null;
      })
      .with({ kind: 'place' }, () => {
        offer = placedOffer(host, chapter, rects);
      })
      .exhaustive();
  }

  function askAboutTheOffer(): void {
    if (queued !== null) return;

    queued = requestAnimationFrame(() => {
      queued = null;
      followTheSelection();
    });
  }

  function takeLift(): void {
    const held = offer;
    offer = null;
    if (held === null) return;

    const passage = selectedPassage(held.chapter.doc, held.chapter.index, held.chapter.cfis);
    for (const doc of chapters) forgetSelection(doc);
    if (passage === null) return;

    if (panel !== undefined) panelAsked = true;
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
    showing = chapter;

    doc.addEventListener('keydown', onkey);
    relayKeydownsTo(window, doc);
    doc.addEventListener('selectionchange', askAboutTheOffer);
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

  $effect(() => {
    if (reported !== null) askAboutTheOffer();
  });

  $effect(() => {
    const host = stage;
    const held = book;
    if (host === null) return;

    const began = (event: PointerEvent): void =>
      press(event, spotOn(host, event, HOST_VIEWPORT_ORIGIN));
    const ended = (event: PointerEvent): void =>
      release(event, spotOn(host, event, HOST_VIEWPORT_ORIGIN));

    host.addEventListener('pointerdown', began);
    host.addEventListener('pointerup', ended);
    host.addEventListener('pointercancel', cancel);

    void view.open(held, (opening) =>
      openFlowSurface(host, opening, (chapter) => bind(host, chapter)),
    );
    return () => {
      host.removeEventListener('pointerdown', began);
      host.removeEventListener('pointerup', ended);
      host.removeEventListener('pointercancel', cancel);
      view.close();
      if (queued !== null) cancelAnimationFrame(queued);
      queued = null;
      gestures = null;
      showing = null;
      pointerHeld = false;
      offer = null;
      contentsOpen = false;
      settingsOpen = false;
      chapters.clear();
    };
  });
</script>

<svelte:window onkeydown={onkey} />

<div
  class={[
    'flow-viewer-b col gap-0 overflow-hidden surface-bg',
    fill === 'screen' ? 'h-screen' : 'flex-1 min-h-0',
  ]}
>
  <div
    class={['relative gap-0 flex-1 min-h-0 overflow-hidden', narrow ? 'col' : 'row']}
    bind:clientWidth={bodyWidth}
  >
    <CompactProbe bind:width={compactWidth} />

    <div
      class="reading overlay-host relative flex-1 min-h-0 overflow-hidden"
      style:--chrome-top="{awake ? topHeight : 0}px"
    >
      <div class="stage min-h-0" tabindex="-1" bind:this={stage}></div>

      <PageInkProbe onink={(ink) => view.paint(ink)} />

      {#if offer !== null}
        <div
          class="lift z-overlay"
          style:--lift-left="{offer.left}px"
          style:--lift-top="{offer.top}px"
          style:--lift-width="{LIFT_BUTTON_WIDTH_PX}px"
          style:--lift-height="{LIFT_BUTTON_HEIGHT_PX}px"
        >
          <Button variant="accent" square pill class="lift-button" onclick={takeLift}>
            <Pencil class="btn-icon" />
            <span class="visually-hidden">{LIFT_LABEL}</span>
          </Button>
        </div>
      {/if}

      <header
        class={[
          'pin-top z-sticky row wrap items-center gap-2 px-responsive py-2 surface border-b shadow-sm hushable',
          { 'is-hushed': !awake },
        ]}
        inert={!awake}
        bind:this={topBar}
        bind:offsetHeight={topHeight}
      >
        <Button href="/" size="sm" class="shrink-0">
          <ChevronLeft class="btn-icon" />
          Library
        </Button>

        <div class="col gap-0 flex-1">
          <h1 class="text-base weight-medium truncate" lang={book.language}>{book.title}</h1>
          <p class="text-xs text-faint truncate">{meta}</p>
        </div>

        {#if reading}
          {#if contents.kind === 'listed'}
            <Button
              size="sm"
              class="shrink-0"
              aria-haspopup="dialog"
              onclick={() => (contentsOpen = true)}
            >
              {CONTENTS_LABEL}
            </Button>
          {:else}
            <p class="text-xs text-faint shrink-0">{NO_CONTENTS_LABEL}</p>
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
      </header>

      <footer
        class={[
          'pin-bottom z-sticky row items-center gap-2 px-responsive py-2 surface border-t hushable',
          { 'is-hushed': !awake },
        ]}
        inert={!awake}
        bind:this={bottomBar}
      >
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
      </footer>

      {#if view.notice !== null}
        <div class="told z-sticky">
          <Alert dismissLabel="Hide this message" ondismiss={() => view.dismissNotice()}>
            {view.notice}
          </Alert>
        </div>
      {/if}

      {#if curtain.kind === 'opening'}
        <div class="curtain overlay-fill z-overlay col items-center gap-3 p-5 surface-bg">
          <p class="prose text-sm text-muted" aria-live="polite">Opening this book…</p>
        </div>
      {:else if message !== null}
        <div class="curtain overlay-fill z-overlay col items-center gap-3 p-5 surface-bg">
          <p class="prose text-sm text-muted" aria-live="polite">{message}</p>
          <Button href="/" variant="primary" size="sm">Back to your library</Button>
        </div>
      {/if}
    </div>

    {#if panel !== undefined}
      <PanelDock {placement} count={panelCount ?? null} {panel} ontoggle={togglePanel} />
    {/if}
  </div>
</div>

{#if contents.kind === 'listed'}
  <FlowContentsDialog
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
/>
