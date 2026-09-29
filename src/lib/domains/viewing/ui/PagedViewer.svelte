<script lang="ts">
  import { flushSync, onDestroy, untrack } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { match } from 'ts-pattern';
  import Carousel from '$lib/components/Carousel.svelte';
  import KeyHints from '$lib/components/KeyHints.svelte';
  import { CAROUSEL_REST } from '$lib/components/carousel';
  import type { CarouselMotion, CarouselSide } from '$lib/components/carousel';
  import type { GestureInput, GestureSample, GestureState } from '$lib/components/gesture';
  import { GestureFeed } from '$lib/components/gesture-feed';
  import {
    canPan,
    centrePan,
    clampPan,
    doubleTapTarget,
    fitZoom,
    panBy,
    pinchStep,
    wheelPixels,
    wheelZoomFactor,
    zoomAt,
    ZOOM_STEP,
  } from '$lib/components/pan-zoom';
  import type { Pinch, Viewport, ZoomPoint } from '$lib/components/pan-zoom';
  import type { CaptureOrigin } from '$lib/shared/capture-origin';
  import type { Size } from '$lib/shared/geometry';
  import type { ImageIndex } from '$lib/shared/ids';
  import type { GlowRegion, ImageRegion } from '$lib/shared/image-region';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import type { PagePicture } from '$lib/shared/page-source';
  import type { PageFit } from '$lib/shared/page-fit';
  import { SIDE_ZONE_SHARE, swipeMayStart } from '$lib/shared/page-turn';
  import type { FrameSpan, TouchTurns } from '$lib/shared/page-turn';
  import { readTouchTurns } from '$lib/shared/touch-turns';
  import type { PageGroup } from '../domain/page-pairing';
  import { FIT_HEIGHT_ZOOM, arrivalViewport, pageFitZoom } from '../domain/viewport';
  import type { Framing } from '../domain/viewport';
  import type { PanReach } from '../domain/overscroll';
  import { heldHints, hintsToShow, inputKind, readerHints, recallAfterPress } from './gesture-hint';
  import type { GestureHint, HintRecall } from './gesture-hint';
  import { handlesOwnKeys, handlesOwnSpace } from './keyboard';
  import { hintsWanted, learnedGestures, learnGesture } from './learned-gestures.svelte';
  import { glowOn } from './page-glow';
  import type { PageMove } from './page-moves';
  import { moveOf, slideInput, slidePanes, slideTravel } from './page-slide';
  import type { Neighbours, SlidePane } from './page-slide';
  import { centreZoneWaits, touchAction, touchLesson } from './touch-action';
  import type { TouchAction } from './touch-action';
  import { showsZoneOverlay, zoneLabels } from './zone-overlay';
  import { markZonesSeen, zonesSeen } from './zones-seen.svelte';
  import PageFrame from './PageFrame.svelte';
  import SelectionLayer from './SelectionLayer.svelte';
  import './paged-viewer.css';

  type Fit = PageFit | 'free';

  type Grab = {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly bySpace: boolean;
  };

  const NO_NEIGHBOURS: Neighbours = { decrement: null, increment: null };

  type Props = {
    readonly pages: PageGroup;
    readonly beside?: Neighbours;
    readonly direction: ReadingDirection;
    readonly pageFit: PageFit;
    readonly pictureAt: (index: ImageIndex) => Promise<PagePicture | null>;
    readonly measured: (index: ImageIndex, size: Size) => void;
    readonly glow?: readonly GlowRegion[];
    readonly makes?: CaptureOrigin;
    readonly chromeShown: boolean;
    readonly selecting?: boolean;
    readonly turns?: TouchTurns;
    readonly select: (regions: readonly ImageRegion[]) => void;
    readonly clear: () => void;
    readonly onTap: () => void;
    readonly onFit: (fit: PageFit) => void;
    readonly onTurn?: (move: PageMove) => void;
  };

  let {
    pages,
    beside = NO_NEIGHBOURS,
    direction,
    pageFit,
    pictureAt,
    measured,
    glow = [],
    makes = 'recognized',
    chromeShown,
    selecting = false,
    turns = readTouchTurns(),
    select,
    clear,
    onTap,
    onFit,
    onTurn,
  }: Props = $props();

  let frame = $state<HTMLDivElement | null>(null);
  let strip = $state<HTMLDivElement | null>(null);
  let selection = $state<ReturnType<typeof SelectionLayer> | null>(null);
  let carousel = $state<ReturnType<typeof Carousel<SlidePane>> | null>(null);
  let viewport = $state.raw<Viewport>({ zoom: FIT_HEIGHT_ZOOM, panX: 0, panY: 0 });
  let fit = $state.raw<Fit>(untrack(() => pageFit));
  let grab = $state.raw<Grab | null>(null);
  let spaceHeld = $state(false);
  let pannable = $state(false);
  let recall = $state<HintRecall>('earned');
  let heldLines: readonly GestureHint[] = [];
  let motion = $state.raw<CarouselMotion>(CAROUSEL_REST);
  let lastPointerType = $state<string | null>(null);
  let frameSize = $state.raw<Size | null>(null);

  const contents = new SvelteMap<ImageIndex, Size>();
  const gestures = new GestureFeed(feed);

  let shownPages: PageGroup | null = null;
  let panOrigin: Viewport = { zoom: FIT_HEIGHT_ZOOM, panX: 0, panY: 0 };
  let lastPointer = '';
  let slides = false;

  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const panes = $derived(slidePanes(pages, beside, direction));

  const pointing = $derived(inputKind(lastPointerType, coarse));

  const pending = $derived(
    hintsToShow(
      readerHints({ input: pointing, layoutKind: 'paged', pannable, turns }),
      learnedGestures(),
      { chromeShown, wanted: hintsWanted(), recall, input: pointing },
    ),
  );
  const hintLines = $derived.by(() => {
    heldLines = heldHints(heldLines, pending);
    return heldLines;
  });

  const zonesShown = $derived(showsZoneOverlay({ turns, input: pointing, seen: zonesSeen() }));

  function label(index: ImageIndex): string {
    return String(index + 1).padStart(3, '0');
  }

  function selected(regions: readonly ImageRegion[]): void {
    learnGesture(lastPointer === 'touch' ? 'touch-select' : 'select');
    select(regions);
  }

  function framesNow(): Framing | null {
    const outer = frame;
    const inner = strip;
    if (outer === null || inner === null) return null;

    const zoom = viewport.zoom;
    if (!Number.isFinite(zoom) || zoom <= 0) return null;

    const outerBox = outer.getBoundingClientRect();
    const innerBox = inner.getBoundingClientRect();

    return {
      frame: { width: outerBox.width, height: outerBox.height },
      content: { width: innerBox.width / zoom, height: innerBox.height / zoom },
    };
  }

  function framingOf(key: ImageIndex | undefined): Framing | null {
    const content = key === undefined ? undefined : contents.get(key);
    const outer = frameSize;
    return content === undefined || outer === null ? null : { content, frame: outer };
  }

  function paneViewport(pane: SlidePane): Viewport {
    return pane.beside === 0 ? viewport : arrivalViewport(fit, viewport, framingOf(pane.key));
  }

  function measureFrame(element: HTMLDivElement): () => void {
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        frameSize = { width: entry.contentRect.width, height: entry.contentRect.height };
      }
      refitWhenFramed();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }

  function measureContent(key: ImageIndex): (element: HTMLDivElement) => () => void {
    return (element) => {
      const observer = new ResizeObserver(([entry]) => {
        if (entry !== undefined) {
          contents.set(key, { width: entry.contentRect.width, height: entry.contentRect.height });
        }
      });
      observer.observe(element);
      return () => {
        observer.disconnect();
        contents.delete(key);
      };
    };
  }

  function commit(next: Viewport, sizes: Framing | null): void {
    viewport = next;
    if (sizes !== null) pannable = canPan(sizes.content, sizes.frame, next.zoom);
  }

  function settle(next: Viewport): void {
    const sizes = framesNow();
    commit(sizes === null ? next : clampPan(next, sizes.content, sizes.frame), sizes);
  }

  function recentre(zoom: number): void {
    const sizes = framesNow();
    const next: Viewport = { zoom, panX: viewport.panX, panY: viewport.panY };
    commit(sizes === null ? next : centrePan(next, sizes.content, sizes.frame), sizes);
  }

  function arrive(key: ImageIndex | undefined): void {
    const sizes = framingOf(key) ?? framesNow();
    commit(arrivalViewport(fit, viewport, sizes), sizes);
  }

  function applyHeight(): void {
    fit = 'height';
    recentre(FIT_HEIGHT_ZOOM);
  }

  function applyWidth(): void {
    const sizes = framesNow();
    fit = 'width';
    if (sizes === null) return;
    recentre(fitZoom(sizes.content, sizes.frame, 'width'));
  }

  export function fitHeight(): void {
    applyHeight();
    onFit('height');
  }

  export function fitWidth(): void {
    applyWidth();
    onFit('width');
  }

  export function surface(): HTMLElement | null {
    return frame;
  }

  export function activeFit(): Fit {
    return fit;
  }

  function reapplyFit(): void {
    match(fit)
      .with('height', () => applyHeight())
      .with('width', () => applyWidth())
      .with('free', () => settle(viewport))
      .exhaustive();
  }

  function zoomed(next: Viewport): void {
    fit = 'free';
    settle(next);
    if (pannable) learnGesture('zoom-to-pan');
  }

  function framePoint(x: number, y: number): ZoomPoint | null {
    const element = frame;
    if (element === null) return null;

    const box = element.getBoundingClientRect();
    return { x: x - box.left, y: y - box.top };
  }

  function pinched(pinch: Pinch): void {
    const sizes = framesNow();
    const centre = framePoint(pinch.cx, pinch.cy);
    if (sizes === null || centre === null) return;

    zoomed(
      pinchStep(
        viewport,
        { ...pinch, cx: centre.x, cy: centre.y },
        { content: sizes.content, frame: sizes.frame, floor: pageFitZoom(pageFit, sizes) },
      ),
    );
  }

  function doubleTapped(at: ZoomPoint): void {
    const sizes = framesNow();
    const point = framePoint(at.x, at.y);
    if (sizes === null || point === null) return;

    const target = doubleTapTarget(viewport, pageFitZoom(pageFit, sizes), point);
    if (target.kind === 'zoom') {
      zoomed(target.viewport);
      return;
    }

    fit = pageFit;
    settle(target.viewport);
  }

  function stepZoom(factor: number): void {
    const sizes = framesNow();
    if (sizes === null) return;

    zoomed(zoomAt(viewport, factor, sizes.frame.width / 2, sizes.frame.height / 2));
  }

  function release(id: number): void {
    const element = frame;
    if (element !== null && element.hasPointerCapture(id)) element.releasePointerCapture(id);
  }

  function stopGrab(): void {
    const moving = grab;
    if (moving === null) return;
    release(moving.id);
    grab = null;
  }

  function startGrab(element: HTMLElement, event: PointerEvent, bySpace: boolean): void {
    grab = { id: event.pointerId, x: event.clientX, y: event.clientY, bySpace };
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function dropSpace(): void {
    spaceHeld = false;
    if (grab !== null && grab.bySpace) stopGrab();
  }

  function onwheel(event: WheelEvent): void {
    const element = frame;
    if (element === null) return;

    event.preventDefault();
    const box = element.getBoundingClientRect();
    const dx = wheelPixels(event.deltaX, event.deltaMode, box.width);
    const dy = wheelPixels(event.deltaY, event.deltaMode, box.height);

    if (event.ctrlKey || event.metaKey) {
      zoomed(zoomAt(viewport, wheelZoomFactor(dy), event.clientX - box.x, event.clientY - box.y));
      return;
    }

    if (event.shiftKey) {
      settle(panBy(viewport, -(dx + dy), 0));
      return;
    }

    settle(panBy(viewport, -dx, -dy));
  }

  function frameSpan(): FrameSpan {
    const element = frame;
    if (element === null) return { left: 0, width: 0 };

    const box = element.getBoundingClientRect();
    return { left: box.left, width: box.width };
  }

  function act(action: TouchAction): void {
    match(action)
      .with({ kind: 'none' }, () => undefined)
      .with({ kind: 'toggle-chrome' }, () => onTap())
      .with({ kind: 'turn' }, ({ move }) => onTurn?.(move))
      .with({ kind: 'pan' }, ({ dx, dy }) => settle(panBy(viewport, dx, dy)))
      .with({ kind: 'pinch' }, (pinch) => pinched(pinch))
      .with({ kind: 'zoom-toggle' }, ({ at }) => doubleTapped(at))
      .with({ kind: 'select-begin' }, ({ from, to }) => {
        const touch = gestures.state;
        if (touch.kind === 'selecting') selection?.beginAt(touch.id, from, to);
      })
      .with({ kind: 'select-move' }, ({ at }) => selection?.extendTo(at))
      .with({ kind: 'select-end' }, ({ at }) => selection?.endAt(at))
      .with({ kind: 'drop' }, () => selection?.abandon())
      .exhaustive();
  }

  function panReach(): PanReach | null {
    const sizes = framesNow();
    return sizes === null
      ? null
      : { origin: panOrigin, content: sizes.content, frame: sizes.frame };
  }

  function refitWhenFramed(): void {
    if (frame !== null && strip !== null) reapplyFit();
  }

  function holdStrip(element: HTMLDivElement): () => void {
    strip = element;
    const observer = new ResizeObserver(() => refitWhenFramed());
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (strip === element) strip = null;
    };
  }

  function settledTowards(side: CarouselSide): void {
    onTurn?.(moveOf(side, direction));
  }

  function followsTheFinger(input: GestureInput, span: FrameSpan): boolean {
    if (input.kind === 'tick') return false;
    return swipeMayStart(input, span, window.innerWidth, turns);
  }

  function slideWith(state: GestureState, action: TouchAction): boolean {
    const travel = slides ? slideTravel(state, state.kind === 'panning' ? panReach() : null) : 0;
    const turn = action.kind === 'turn' ? action.move : null;
    return carousel?.drive(slideInput(state, travel, turn, direction)) ?? false;
  }

  function feed(input: GestureInput): void {
    if (input.kind === 'down' && gestures.state.kind === 'idle') {
      if (motion.kind === 'settle') {
        carousel?.finish();
        flushSync();
      }
      panOrigin = viewport;
      slides = followsTheFinger(input, frameSpan());
    }

    const span = frameSpan();
    const step = gestures.step(input, {
      pannable,
      selectMode: selecting,
      waitsForDoubleTap: centreZoneWaits(span, turns),
    });
    const action = touchAction(step.intent, {
      chromeShown,
      turns,
      direction,
      frame: span,
      viewportWidth: window.innerWidth,
      reach: step.intent.kind === 'pan-end' ? panReach() : null,
    });
    const lesson = touchLesson(step.intent, action);
    if (lesson !== null) learnGesture(lesson);
    const handed = slideWith(step.state, action);
    if (!(handed && action.kind === 'turn')) act(action);
  }

  function feedTouch(kind: GestureSample['kind'], event: PointerEvent): void {
    feed(gestures.sample(kind, event));
  }

  function oncontextmenu(event: MouseEvent): void {
    if (lastPointer === 'touch') event.preventDefault();
  }

  function onpointerdown(event: PointerEvent): void {
    const element = frame;
    if (element === null) return;

    lastPointer = event.pointerType;
    if (event.pointerType === 'touch') {
      element.setPointerCapture(event.pointerId);
      event.preventDefault();
      feedTouch('down', event);
      return;
    }

    if (event.button === 1) {
      startGrab(element, event, false);
      return;
    }

    if (!event.isPrimary || event.button !== 0) return;

    if (spaceHeld) {
      startGrab(element, event, true);
      return;
    }

    selection?.pointerdown(event);
  }

  function onpointermove(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      feedTouch('move', event);
      return;
    }

    const moving = grab;
    if (moving !== null && moving.id === event.pointerId) {
      learnGesture(moving.bySpace ? 'space-pan' : 'middle-pan');
      grab = { id: moving.id, x: event.clientX, y: event.clientY, bySpace: moving.bySpace };
      settle(panBy(viewport, event.clientX - moving.x, event.clientY - moving.y));
      return;
    }

    selection?.pointermove(event);
  }

  function onpointerup(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      feedTouch('up', event);
      return;
    }

    if (grab !== null && grab.id === event.pointerId) {
      stopGrab();
      return;
    }

    selection?.pointerup(event);
  }

  function onpointercancel(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      feedTouch('cancel', event);
      return;
    }

    if (grab !== null && grab.id === event.pointerId) {
      stopGrab();
      return;
    }

    selection?.pointercancel(event);
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;

    if (event.key === 'Escape') {
      selection?.dismiss();
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (handlesOwnKeys(event.target)) return;

    if (event.key === '?') {
      event.preventDefault();
      recall = recallAfterPress(pending);
      return;
    }

    if (event.key === ' ') {
      if (handlesOwnSpace(event.target)) return;
      event.preventDefault();
      spaceHeld = true;
      return;
    }

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      stepZoom(ZOOM_STEP);
      return;
    }

    if (event.key === '-') {
      event.preventDefault();
      stepZoom(1 / ZOOM_STEP);
      return;
    }

    if (event.key === '0') {
      event.preventDefault();
      fitHeight();
    }
  }

  function onkeyup(event: KeyboardEvent): void {
    if (event.key !== ' ') return;
    dropSpace();
  }

  function onblur(): void {
    dropSpace();
  }

  function noticePointer(event: PointerEvent): void {
    lastPointerType = event.pointerType;
  }

  function holdZones(event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (event.currentTarget instanceof Element)
      event.currentTarget.setPointerCapture(event.pointerId);
  }

  function swallow(event: PointerEvent): void {
    event.stopPropagation();
  }

  function dismissZones(event: PointerEvent): void {
    event.stopPropagation();
    markZonesSeen();
  }

  onDestroy(() => gestures.stop());

  $effect(() => {
    const group = pages;

    untrack(() => {
      if (group === shownPages) return;

      shownPages = group;
      carousel?.rest();
      selection?.reset();
      stopGrab();
      arrive(group[0]);
    });
  });
</script>

<svelte:window {onkeydown} {onkeyup} {onblur} onpointerdowncapture={noticePointer} />

<div class="paged-viewer row gap-0 flex-1 min-h-0 overflow-hidden scheme-dark surface-sunken">
  <div
    class={[
      'frame relative row gap-0 flex-1 min-h-0 overflow-hidden',
      {
        'is-grabbable': spaceHeld && grab === null && !(selection?.dragging() ?? false),
        'is-grabbing': grab !== null,
      },
    ]}
    role="group"
    aria-label="Pages in view"
    tabindex="-1"
    bind:this={frame}
    {@attach measureFrame}
    {onwheel}
    {onpointerdown}
    {onpointermove}
    {onpointerup}
    {onpointercancel}
    {oncontextmenu}
  >
    <Carousel
      bind:this={carousel}
      bind:motion
      class="flex-1"
      slides={panes}
      driven
      onsettled={settledTowards}
    >
      {#snippet slide(pane)}
        {@const view = paneViewport(pane)}
        <div
          class={[
            'strip zoom-surface row gap-0 shrink-0 h-full',
            { 'is-rtl': direction === 'rtl' },
          ]}
          style:--zoom-surface-pan-x="{view.panX}px"
          style:--zoom-surface-pan-y="{view.panY}px"
          style:--zoom-surface-zoom={view.zoom}
          {@attach pane.beside === 0 ? holdStrip : null}
          {@attach untrack(() => measureContent(pane.key))}
        >
          {#each pane.pages as index (index)}
            <PageFrame
              {index}
              label={label(index)}
              {pictureAt}
              {measured}
              glow={glowOn(glow, index)}
              beside={pane.beside !== 0}
            />
          {/each}
        </div>
      {/snippet}
    </Carousel>

    <SelectionLayer
      bind:this={selection}
      within={frame}
      arrangement="row"
      pointerTypes="any"
      {makes}
      suppressed={spaceHeld}
      select={selected}
      {clear}
      tap={onTap}
    />

    <KeyHints
      hints={hintLines}
      size="sm"
      decorative
      class={[
        'pin-bottom pin-lift z-sticky pass-through px-3 py-2 hushable',
        { 'is-hushed': pending.length === 0 },
      ]}
    />

    {#if zonesShown}
      <div
        class="zones scrim z-sticky"
        style:--side-share={SIDE_ZONE_SHARE}
        aria-hidden="true"
        onpointerdown={holdZones}
        onpointermove={swallow}
        onpointerup={dismissZones}
        onpointercancel={dismissZones}
      >
        {#each zoneLabels(direction) as zone (zone.zone)}
          <div class="zone row items-center justify-center">
            <span class="text-sm weight-medium">{zone.label}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
