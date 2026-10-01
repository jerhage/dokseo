<script lang="ts">
  import { flushSync, onDestroy, untrack } from 'svelte';
  import { match } from 'ts-pattern';
  import Carousel from '$lib/components/Carousel.svelte';
  import KeyHints from '$lib/components/KeyHints.svelte';
  import { CAROUSEL_REST } from '$lib/components/carousel';
  import type { CarouselMotion, CarouselSide } from '$lib/components/carousel';
  import type { GestureInput, GestureSample, GestureState } from '$lib/components/gesture';
  import { GestureFeed } from '$lib/components/gesture-feed';
  import { ZOOM_STEP, wheelPixels, wheelZoomFactor } from '$lib/components/pan-zoom';
  import type { CaptureOrigin } from '$lib/shared/capture-origin';
  import type { Size } from '$lib/shared/geometry';
  import type { ImageIndex } from '$lib/shared/ids';
  import LessonScrim from '$lib/shared/LessonScrim.svelte';
  import type { GlowRegion, ImageRegion } from '$lib/shared/image-region';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import type { PagePicture } from '$lib/shared/page-source';
  import type { PageFit } from '$lib/shared/page-fit';
  import { SIDE_ZONE_SHARE, swipeMayStart } from '$lib/shared/page-turn';
  import type { FrameSpan, TouchTurns } from '$lib/shared/page-turn';
  import SwipeLine from '$lib/shared/SwipeLine.svelte';
  import { TouchGuide } from '$lib/shared/touch-guide.svelte';
  import { readTouchTurns } from '$lib/shared/touch-turns';
  import type { PageGroup } from '../domain/page-pairing';
  import type { ViewportFit } from '../domain/viewport';
  import { inputKind } from './gesture-hint';
  import { GrabPan } from './grab-pan.svelte';
  import { HintLines } from './hint-lines.svelte';
  import { handlesOwnKeys, handlesOwnSpace } from './keyboard';
  import { learnGesture } from './learned-gestures.svelte';
  import { glowOn } from './page-glow';
  import type { PageMove } from './page-moves';
  import { PagedViewport } from './paged-viewport.svelte';
  import { moveOf, slideInput, slidePanes, slideTravel } from './page-slide';
  import type { Neighbours, SlidePane } from './page-slide';
  import { centreZoneWaits, touchAction, touchLesson } from './touch-action';
  import type { TouchAction } from './touch-action';
  import { offersTouchGuide, pagedGuide } from './touch-guide';
  import PageFrame from './PageFrame.svelte';
  import SelectionLayer from './SelectionLayer.svelte';
  import './paged-viewer.css';

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
  let motion = $state.raw<CarouselMotion>(CAROUSEL_REST);
  let lastPointerType = $state<string | null>(null);

  const gestures = new GestureFeed(feed);
  const pan = new GrabPan(() => frame);
  const view = new PagedViewport(
    {
      boxes: () => {
        const outer = frame;
        const inner = strip;
        if (outer === null || inner === null) return null;
        return { frame: outer.getBoundingClientRect(), strip: inner.getBoundingClientRect() };
      },
      offset: () => frame?.getBoundingClientRect() ?? null,
    },
    () => pageFit,
  );

  let shownPages: PageGroup | null = null;
  let lastPointer = '';
  let slides = false;

  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const panes = $derived(slidePanes(pages, beside, direction));

  const pointing = $derived(inputKind(lastPointerType, coarse));

  const hints = new HintLines(() => ({
    scene: { input: pointing, layoutKind: 'paged', pannable: view.pannable, turns },
    chromeShown,
  }));

  const guide = $derived(pagedGuide(turns, direction));
  const touchGuide = new TouchGuide(() => guide.kind);
  touchGuide.open();
  const guideShown = $derived(touchGuide.shownWhen(offersTouchGuide(pointing)));

  function label(index: ImageIndex): string {
    return String(index + 1).padStart(3, '0');
  }

  function selected(regions: readonly ImageRegion[]): void {
    learnGesture(lastPointer === 'touch' ? 'touch-select' : 'select');
    select(regions);
  }

  function measureFrame(element: HTMLDivElement): () => void {
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        view.framed({ width: entry.contentRect.width, height: entry.contentRect.height });
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
          view.measured(key, { width: entry.contentRect.width, height: entry.contentRect.height });
        }
      });
      observer.observe(element);
      return () => {
        observer.disconnect();
        view.forget(key);
      };
    };
  }

  export function fitHeight(): void {
    view.fitHeight();
    onFit('height');
  }

  export function fitWidth(): void {
    view.fitWidth();
    onFit('width');
  }

  export function surface(): HTMLElement | null {
    return frame;
  }

  export function offersGuide(): boolean {
    return offersTouchGuide(pointing);
  }

  export function showGuide(): void {
    touchGuide.recall();
  }

  export function activeFit(): ViewportFit {
    return view.fit;
  }

  function onwheel(event: WheelEvent): void {
    const element = frame;
    if (element === null) return;

    event.preventDefault();
    const box = element.getBoundingClientRect();
    const dx = wheelPixels(event.deltaX, event.deltaMode, box.width);
    const dy = wheelPixels(event.deltaY, event.deltaMode, box.height);

    if (event.ctrlKey || event.metaKey) {
      view.zoomAt(wheelZoomFactor(dy), event.clientX - box.x, event.clientY - box.y);
      return;
    }

    if (event.shiftKey) {
      view.panBy(-(dx + dy), 0);
      return;
    }

    view.panBy(-dx, -dy);
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
      .with({ kind: 'pan' }, ({ dx, dy }) => view.panBy(dx, dy))
      .with({ kind: 'pinch' }, (pinch) => view.pinch(pinch))
      .with({ kind: 'zoom-toggle' }, ({ at }) => view.doubleTap(at))
      .with({ kind: 'select-begin' }, ({ from, to }) => {
        const touch = gestures.state;
        if (touch.kind === 'selecting') selection?.beginAt(touch.id, from, to);
      })
      .with({ kind: 'select-move' }, ({ at }) => selection?.extendTo(at))
      .with({ kind: 'select-end' }, ({ at }) => selection?.endAt(at))
      .with({ kind: 'drop' }, () => selection?.abandon())
      .exhaustive();
  }

  function refitWhenFramed(): void {
    if (frame !== null && strip !== null) view.refit();
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
    const travel = slides
      ? slideTravel(state, state.kind === 'panning' ? view.panReach() : null)
      : 0;
    const turn = action.kind === 'turn' ? action.move : null;
    return carousel?.drive(slideInput(state, travel, turn, direction)) ?? false;
  }

  function feed(input: GestureInput): void {
    if (input.kind === 'down' && gestures.state.kind === 'idle') {
      if (motion.kind === 'settle') {
        carousel?.finish();
        flushSync();
      }
      view.holdPanOrigin();
      slides = followsTheFinger(input, frameSpan());
    }

    const span = frameSpan();
    const step = gestures.step(input, {
      pannable: view.pannable,
      selectMode: selecting,
      waitsForDoubleTap: centreZoneWaits(span, turns),
    });
    const action = touchAction(step.intent, {
      chromeShown,
      turns,
      direction,
      frame: span,
      viewportWidth: window.innerWidth,
      reach: step.intent.kind === 'pan-end' ? view.panReach() : null,
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

    match(pan.press(event))
      .with({ kind: 'grab' }, ({ bySpace }) => {
        pan.start(element, event, bySpace);
        event.preventDefault();
      })
      .with({ kind: 'ignore' }, () => undefined)
      .with({ kind: 'select' }, () => selection?.pointerdown(event))
      .exhaustive();
  }

  function onpointermove(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      feedTouch('move', event);
      return;
    }

    const step = pan.move(event);
    if (step !== null) {
      learnGesture(step.bySpace ? 'space-pan' : 'middle-pan');
      view.panBy(step.dx, step.dy);
      return;
    }

    selection?.pointermove(event);
  }

  function onpointerup(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      feedTouch('up', event);
      return;
    }

    if (pan.owns(event.pointerId)) {
      pan.stop();
      return;
    }

    selection?.pointerup(event);
  }

  function onpointercancel(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      feedTouch('cancel', event);
      return;
    }

    if (pan.owns(event.pointerId)) {
      pan.stop();
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
      hints.pressRecall();
      return;
    }

    if (event.key === ' ') {
      if (handlesOwnSpace(event.target)) return;
      event.preventDefault();
      pan.holdSpace();
      return;
    }

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      view.stepZoom(ZOOM_STEP);
      return;
    }

    if (event.key === '-') {
      event.preventDefault();
      view.stepZoom(1 / ZOOM_STEP);
      return;
    }

    if (event.key === '0') {
      event.preventDefault();
      fitHeight();
    }
  }

  function onkeyup(event: KeyboardEvent): void {
    if (event.key !== ' ') return;
    pan.dropSpace();
  }

  function onblur(): void {
    pan.dropSpace();
  }

  function noticePointer(event: PointerEvent): void {
    lastPointerType = event.pointerType;
  }

  onDestroy(() => gestures.stop());

  $effect(() => {
    const group = pages;

    untrack(() => {
      if (group === shownPages) return;

      shownPages = group;
      carousel?.rest();
      selection?.reset();
      pan.stop();
      view.arrive(group[0]);
    });
  });
</script>

<svelte:window {onkeydown} {onkeyup} {onblur} onpointerdowncapture={noticePointer} />

<div class="paged-viewer row gap-0 flex-1 min-h-0 overflow-hidden scheme-dark surface-sunken">
  <div
    class={[
      'frame relative row gap-0 flex-1 min-h-0 overflow-hidden',
      {
        'is-grabbable': pan.grabbable(() => selection?.dragging() ?? false),
        'is-grabbing': pan.grabbing,
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
        {@const shown = view.paneViewport(pane)}
        <div
          class={[
            'strip zoom-surface row gap-0 shrink-0 h-full',
            { 'is-rtl': direction === 'rtl' },
          ]}
          style:--zoom-surface-pan-x="{shown.panX}px"
          style:--zoom-surface-pan-y="{shown.panY}px"
          style:--zoom-surface-zoom={shown.zoom}
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
      suppressed={pan.spaceHeld}
      select={selected}
      {clear}
      tap={onTap}
    />

    <KeyHints
      hints={hints.lines}
      size="sm"
      decorative
      class={[
        'pin-bottom pin-lift z-sticky pass-through px-3 py-2 hushable',
        { 'is-hushed': hints.hushed },
      ]}
    />

    {#if guideShown}
      <LessonScrim class="col gap-0" ondismiss={() => touchGuide.dismiss()}>
        {#if guide.zones.length > 0}
          <div class="zones flex-1 min-h-0" style:--side-share={SIDE_ZONE_SHARE}>
            {#each guide.zones as zone (zone.zone)}
              <div class="zone row items-center justify-center">
                <span class="text-sm weight-medium">{zone.label}</span>
              </div>
            {/each}
          </div>
        {/if}
        <div
          class={[
            'row items-center justify-center p-4 text-center',
            { 'flex-1': guide.zones.length === 0 },
          ]}
        >
          <SwipeLine lesson={guide.swipe} />
        </div>
      </LessonScrim>
    {/if}
  </div>
</div>
