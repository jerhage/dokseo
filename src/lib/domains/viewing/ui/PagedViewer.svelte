<script lang="ts">
  import { flushSync, untrack } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { match } from 'ts-pattern';
  import KeyHints from '$lib/components/KeyHints.svelte';
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
  import {
    FIT_HEIGHT_ZOOM,
    arrivalViewport,
    canPan,
    centrePan,
    clampPan,
    doubleTapTarget,
    fitZoom,
    panBy,
    pinchStep,
    zoomAt,
  } from '../domain/viewport';
  import type { Pinch, Viewport, ZoomPoint } from '../domain/viewport';
  import type { PanReach } from '../domain/overscroll';
  import { hintsToShow, inputKind, readerHints } from './gesture-hint';
  import type { GestureHint } from './gesture-hint';
  import { handlesOwnKeys, handlesOwnSpace } from './keyboard';
  import { hintsWanted, learnedGestures, learnGesture } from './learned-gestures.svelte';
  import { glowOn } from './page-glow';
  import type { PageMove } from './page-moves';
  import {
    SLIDE_GAP_PX,
    SLIDE_REST,
    slidePanes,
    slideShift,
    slideStep,
    slideTravel,
  } from './page-slide';
  import type { Neighbours, Slide, SlidePane } from './page-slide';
  import { touchAction, touchLesson } from './touch-action';
  import type { TouchAction } from './touch-action';
  import { TOUCH_IDLE, touchDeadline, touchStep } from './touch-gesture';
  import type { TouchInput, TouchSample, TouchState } from './touch-gesture';
  import { showsZoneOverlay, zoneLabels } from './zone-overlay';
  import { markZonesSeen, zonesSeen } from './zones-seen.svelte';
  import PageFrame from './PageFrame.svelte';
  import SelectionLayer from './SelectionLayer.svelte';
  import './paged-viewer.css';

  type Fit = PageFit | 'free';

  type Frames = { readonly content: Size; readonly frame: Size };

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

  const SETTLE_FALLBACK_MS = 400;
  const ZOOM_STEP = 1.2;
  const WHEEL_ZOOM_SPAN = 320;
  const WHEEL_LINE_PX = 16;

  let frame = $state<HTMLDivElement | null>(null);
  let strip = $state<HTMLDivElement | null>(null);
  let selection = $state<ReturnType<typeof SelectionLayer> | null>(null);
  let viewport = $state.raw<Viewport>({ zoom: FIT_HEIGHT_ZOOM, panX: 0, panY: 0 });
  let fit = $state.raw<Fit>(untrack(() => pageFit));
  let grab = $state.raw<Grab | null>(null);
  let spaceHeld = $state(false);
  let pannable = $state(false);
  let revealed = $state(false);
  let hintLines = $state.raw<readonly GestureHint[]>([]);
  let slide = $state.raw<Slide>(SLIDE_REST);
  let lastPointerType = $state<string | null>(null);
  let frameSize = $state.raw<Size | null>(null);

  const contents = new SvelteMap<ImageIndex, Size>();

  let shownPages: PageGroup | null = null;
  let touch: TouchState = TOUCH_IDLE;
  let touchTimer: ReturnType<typeof setTimeout> | null = null;
  let panOrigin: Viewport = { zoom: FIT_HEIGHT_ZOOM, panX: 0, panY: 0 };
  let lastPointer = '';
  let slides = false;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const panes = $derived(slidePanes(pages, beside, direction));

  const pointing = $derived(inputKind(lastPointerType, coarse));

  const pending = $derived(
    hintsToShow(
      readerHints({ input: pointing, layoutKind: 'paged', pannable, turns }),
      learnedGestures(),
      { chromeShown, wanted: hintsWanted(), revealed, input: pointing },
    ),
  );

  const zonesShown = $derived(showsZoneOverlay({ turns, input: pointing, seen: zonesSeen() }));

  function label(index: ImageIndex): string {
    return String(index + 1).padStart(3, '0');
  }

  function selected(regions: readonly ImageRegion[]): void {
    learnGesture(lastPointer === 'touch' ? 'touch-select' : 'select');
    select(regions);
  }

  function framesNow(): Frames | null {
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

  function framingOf(key: ImageIndex | undefined): Frames | null {
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

  function commit(next: Viewport, sizes: Frames | null): void {
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

  function fitFloor(sizes: Frames): number {
    return match(pageFit)
      .with('height', () => FIT_HEIGHT_ZOOM)
      .with('width', () => fitZoom(sizes.content, sizes.frame, 'width'))
      .exhaustive();
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
        { content: sizes.content, frame: sizes.frame, floor: fitFloor(sizes) },
      ),
    );
  }

  function doubleTapped(at: ZoomPoint): void {
    const sizes = framesNow();
    const point = framePoint(at.x, at.y);
    if (sizes === null || point === null) return;

    const target = doubleTapTarget(viewport, fitFloor(sizes), point);
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

  function scrolled(delta: number, mode: number, extent: number): number {
    if (mode === WheelEvent.DOM_DELTA_LINE) return delta * WHEEL_LINE_PX;
    if (mode === WheelEvent.DOM_DELTA_PAGE) return delta * extent;
    return delta;
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
    const dx = scrolled(event.deltaX, event.deltaMode, box.width);
    const dy = scrolled(event.deltaY, event.deltaMode, box.height);

    if (event.ctrlKey || event.metaKey) {
      zoomed(
        zoomAt(
          viewport,
          Math.exp(-dy / WHEEL_ZOOM_SPAN),
          event.clientX - box.x,
          event.clientY - box.y,
        ),
      );
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

  function stopTouchTimer(): void {
    if (touchTimer !== null) clearTimeout(touchTimer);
    touchTimer = null;
  }

  function scheduleTick(): void {
    stopTouchTimer();
    const deadline = touchDeadline(touch);
    if (deadline === null) return;

    touchTimer = setTimeout(
      () => {
        touchTimer = null;
        feed({ kind: 'tick', t: performance.now() });
      },
      Math.max(0, deadline - performance.now()),
    );
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

  function holdStrip(element: HTMLDivElement): () => void {
    strip = element;
    return () => {
      if (strip === element) strip = null;
    };
  }

  function stopSettleTimer(): void {
    if (settleTimer !== null) clearTimeout(settleTimer);
    settleTimer = null;
  }

  function finishSlide(): void {
    const settling = slide;
    if (settling.kind !== 'settle') return;

    stopSettleTimer();
    slide = SLIDE_REST;
    if (settling.move !== null) onTurn?.(settling.move);
  }

  function settled(event: TransitionEvent): void {
    if (event.target === event.currentTarget && event.propertyName === 'transform') finishSlide();
  }

  function followsTheFinger(input: TouchInput, span: FrameSpan): boolean {
    if (input.kind === 'tick') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return swipeMayStart(input, span, window.innerWidth, turns);
  }

  function slideWith(state: TouchState, action: TouchAction, width: number): boolean {
    const was = slide;
    const travel = slides ? slideTravel(state, state.kind === 'panning' ? panReach() : null) : 0;
    const turn = action.kind === 'turn' ? action.move : null;
    slide = slideStep(was, state, travel, turn, { width, direction, neighbours: beside });

    const handed = was.kind === 'follow' && slide.kind === 'settle';
    if (handed) {
      stopSettleTimer();
      settleTimer = setTimeout(finishSlide, SETTLE_FALLBACK_MS);
    }
    return handed;
  }

  function feed(input: TouchInput): void {
    if (input.kind === 'down' && touch.kind === 'idle') {
      if (slide.kind === 'settle') {
        finishSlide();
        flushSync();
      }
      panOrigin = viewport;
      slides = followsTheFinger(input, frameSpan());
    }

    const span = frameSpan();
    const step = touchStep(touch, input, {
      pannable,
      selectMode: selecting,
      turns,
      frame: span,
      doubleTaps: true,
    });
    touch = step.state;
    scheduleTick();
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
    const handed = slideWith(step.state, action, span.width);
    if (!(handed && action.kind === 'turn')) act(action);
  }

  function feedTouch(kind: TouchSample['kind'], event: PointerEvent): void {
    feed({
      kind,
      id: event.pointerId,
      type: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      t: performance.now(),
    });
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
      revealed = !revealed;
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

  $effect(() => stopTouchTimer);

  $effect(() => stopSettleTimer);

  $effect(() => {
    const lines = pending;
    if (lines.length > 0) hintLines = lines;
  });

  $effect(() => {
    const outer = frame;
    const inner = strip;
    if (outer === null || inner === null) return;

    const observer = new ResizeObserver(() => reapplyFit());
    observer.observe(outer);
    observer.observe(inner);

    return () => observer.disconnect();
  });

  $effect(() => {
    const group = pages;

    untrack(() => {
      if (group === shownPages) return;

      shownPages = group;
      stopSettleTimer();
      slide = SLIDE_REST;
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
    {#each panes as pane (pane.key)}
      {@const view = paneViewport(pane)}
      <div
        class={[
          'pane row gap-0 shrink-0',
          {
            'is-beside': pane.beside !== 0,
            'is-settling': slide.kind === 'settle',
          },
        ]}
        inert={pane.beside !== 0}
        style:--beside={pane.beside}
        style:--slide="{slideShift(slide)}px"
        style:--slide-gap="{SLIDE_GAP_PX}px"
        ontransitionend={settled}
      >
        <div
          class={['strip row gap-0 shrink-0 h-full', { 'is-rtl': direction === 'rtl' }]}
          style:--pan-x="{view.panX}px"
          style:--pan-y="{view.panY}px"
          style:--zoom={view.zoom}
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
      </div>
    {/each}

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
        'pin-bottom pin-lift z-sticky overlay-pass-through px-3 py-2 hushable',
        { 'is-hushed': pending.length === 0 },
      ]}
    />

    {#if zonesShown}
      <div
        class="zones"
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
