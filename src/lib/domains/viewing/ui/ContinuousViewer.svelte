<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { match } from 'ts-pattern';
  import KeyHints from '$lib/ui/components/KeyHints.svelte';
  import type { GestureInput, GestureSample } from '$lib/ui/components/gesture';
  import { GestureFeed } from '$lib/ui/components/gesture-feed';
  import { ZOOM_STEP, wheelPixels, wheelZoomFactor } from '$lib/ui/components/pan-zoom';
  import type { CaptureOrigin } from '$lib/shared/capture-origin';
  import type { Size } from '$lib/shared/geometry';
  import type { ImageIndex } from '$lib/shared/ids';
  import type { GlowRegion, ImageRegion } from '$lib/shared/image-region';
  import LessonScrim from '$lib/shared/LessonScrim.svelte';
  import type { PagePicture } from '$lib/shared/page-source';
  import SwipeLine from '$lib/shared/SwipeLine.svelte';
  import { createTouchGuide } from '$lib/shared/touch-guide.svelte';
  import type { ReadingPosition } from '../domain/reading-position';
  import {
    relayoutFor,
    shownThroughAtScroll,
    spacersFor,
    stripHeight,
    stripWindow,
    travelBetween,
    windowReaching,
    windowScrollTop,
  } from '../domain/strip';
  import type { Travel } from '../domain/strip';
  import type { Point } from '../domain/selection';
  import { EdgeScroll } from './edge-scroll-loop';
  import { inputKind } from './gesture-hint';
  import { createHintLines } from './hint-lines.svelte';
  import { handlesOwnKeys } from './keyboard';
  import { learnGesture } from './learned-gestures.svelte';
  import { glowOn } from './page-glow';
  import PageFrame from './PageFrame.svelte';
  import { scrollMotion } from './scroll-motion';
  import SelectionLayer from './SelectionLayer.svelte';
  import { holdsTheScroll, stripTouchAction } from './strip-touch';
  import { createStripZoom } from './strip-zoom.svelte';
  import { STRIP_GUIDE, STRIP_GUIDE_KIND, offersTouchGuide } from './touch-guide';
  import type { StripTouchAction } from './strip-touch';
  import './continuous-viewer.css';

  type Props = {
    readonly sizes: readonly (Size | null)[];
    readonly start: ReadingPosition;
    readonly pictureAt: (index: ImageIndex) => Promise<PagePicture | null>;
    readonly measured: (index: ImageIndex, size: Size) => void;
    readonly glow?: readonly GlowRegion[];
    readonly makes?: CaptureOrigin;
    readonly chromeShown: boolean;
    readonly selecting?: boolean;
    readonly moveTo: (position: ReadingPosition, shownThrough: ImageIndex) => void;
    readonly select: (regions: readonly ImageRegion[]) => void;
    readonly clear: () => void;
    readonly onTap: () => void;
  };

  let {
    sizes,
    start,
    pictureAt,
    measured,
    glow = [],
    makes = 'recognized',
    chromeShown,
    selecting = false,
    moveTo,
    select,
    clear,
    onTap,
  }: Props = $props();

  const SCREEN_OVERLAP = 0.9;
  const SETTLED_PX = 0.5;
  const DRAG_SELECTS_WITH = ['mouse', 'pen'];

  const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

  let scroller = $state<HTMLDivElement | null>(null);
  let selection = $state<ReturnType<typeof SelectionLayer> | null>(null);
  let frameWidth = $state(0);
  let frameHeight = $state(0);
  let scrolled = $state(0);
  let scrolledLeft = 0;
  let travel = $state<Travel>('down');

  let lastPointerType = $state<string | null>(null);

  let written: { readonly top: number; readonly left: number } | null = null;
  let lastPointer = '';
  let pinned = $state<number | null>(null);

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const gestures = new GestureFeed(feed);
  const edgeScroll = new EdgeScroll({
    surface: () => scroller,
    dragging: () => selection?.dragging() ?? false,
  });

  const strip = createStripZoom(
    () => ({ sizes, frameWidth }),
    untrack(() => start),
  );
  const width = $derived(strip.width);
  const layout = $derived(strip.layout);
  const height = $derived(stripHeight(layout));
  const dragPin = $derived((selection?.dragging() ?? false) ? pinned : null);
  const range = $derived(
    windowReaching(
      layout,
      stripWindow(
        layout,
        windowScrollTop(layout, width, strip.reading, scrolled, strip.hold),
        frameHeight,
        travel,
      ),
      dragPin,
    ),
  );
  const spacers = $derived(spacersFor(layout, range, snapToDevicePixels));
  const pointing = $derived(inputKind(lastPointerType, coarse));
  const hints = createHintLines(() => ({
    scene: { input: pointing, layoutKind: 'continuous', pannable: false, turns: 'swipe-only' },
    chromeShown,
  }));

  const touchGuide = createTouchGuide(() => STRIP_GUIDE_KIND);
  touchGuide.open();
  const guideShown = $derived(touchGuide.shownWhen(offersTouchGuide(pointing)));

  function snapToDevicePixels(value: number): number {
    const ratio = window.devicePixelRatio;
    if (!Number.isFinite(ratio) || ratio <= 0) return value;
    return Math.round(value * ratio) / ratio;
  }

  function label(index: ImageIndex): string {
    return String(index + 1).padStart(3, '0');
  }

  function apply(element: HTMLElement): void {
    const { top, left } = strip.target;
    if (
      Math.abs(element.scrollTop - top) < SETTLED_PX &&
      Math.abs(element.scrollLeft - left) < SETTLED_PX
    ) {
      return;
    }

    element.scrollTop = top;
    element.scrollLeft = left;
    written = { top: element.scrollTop, left: element.scrollLeft };
    scrolled = element.scrollTop;
    scrolledLeft = element.scrollLeft;
  }

  function zoomBy(factor: number, x: number, y: number): void {
    const element = scroller;
    if (element === null) return;

    strip.zoomBy(factor, { top: element.scrollTop, left: element.scrollLeft }, { x, y });
  }

  function pinchBy(scale: number, from: Point, to: Point): void {
    const element = scroller;
    if (element === null) return;

    const box = element.getBoundingClientRect();
    const was = { x: from.x - box.left, y: from.y - box.top };
    const now = { x: to.x - box.left, y: to.y - box.top };
    const scroll = { top: element.scrollTop, left: element.scrollLeft };

    if (!strip.pinch(scale, scroll, was, now)) apply(element);
  }

  function act(action: StripTouchAction): void {
    match(action)
      .with({ kind: 'none' }, () => undefined)
      .with({ kind: 'toggle-chrome' }, () => onTap())
      .with({ kind: 'zoom' }, ({ scale, from, to }) => {
        learnGesture('pinch');
        pinchBy(scale, from, to);
      })
      .with({ kind: 'select-begin' }, ({ from, to }) => {
        const touch = gestures.state;
        if (touch.kind === 'selecting') selection?.beginAt(touch.id, from, to);
        pinDrag(from.y);
      })
      .with({ kind: 'select-move' }, ({ at }) => selection?.extendTo(at))
      .with({ kind: 'select-end' }, ({ at }) => selection?.endAt(at))
      .with({ kind: 'drop' }, () => selection?.abandon())
      .exhaustive();
  }

  function feed(input: GestureInput): void {
    const step = gestures.step(input, {
      pannable: false,
      selectMode: selecting,
      waitsForDoubleTap: () => false,
    });
    act(stripTouchAction(step.intent));
  }

  function feedTouch(kind: GestureSample['kind'], event: PointerEvent): void {
    feed(gestures.sample(kind, event));
  }

  function pinDrag(pointerY: number): void {
    const element = scroller;
    if (element === null || !(selection?.dragging() ?? false)) return;

    pinned = element.scrollTop + pointerY - element.getBoundingClientRect().top;
  }

  function onpointerdown(event: PointerEvent): void {
    lastPointer = event.pointerType;
    if (event.pointerType === 'touch') {
      feedTouch('down', event);
      return;
    }

    selection?.pointerdown(event);
    pinDrag(event.clientY);
  }

  function onpointermove(event: PointerEvent): void {
    if (event.pointerType === 'touch') feedTouch('move', event);
    else selection?.pointermove(event);

    edgeScroll.follow(event.clientY);
  }

  function onpointerup(event: PointerEvent): void {
    edgeScroll.stop();
    if (event.pointerType === 'touch') {
      feedTouch('up', event);
      return;
    }

    selection?.pointerup(event);
  }

  function onpointercancel(event: PointerEvent): void {
    edgeScroll.stop();
    if (event.pointerType === 'touch') {
      feedTouch('cancel', event);
      return;
    }

    selection?.pointercancel(event);
  }

  function selected(regions: readonly ImageRegion[]): void {
    if (lastPointer === 'touch') learnGesture('touch-select');
    select(regions);
  }

  function noticePointer(event: PointerEvent): void {
    lastPointerType = event.pointerType;
  }

  function oncontextmenu(event: MouseEvent): void {
    if (lastPointer === 'touch') event.preventDefault();
  }

  function zoomFromCentre(factor: number): void {
    const element = scroller;
    if (element === null) return;
    zoomBy(factor, element.clientWidth / 2, element.clientHeight / 2);
  }

  export function fitWidth(): void {
    zoomFromCentre(strip.toFitWidth);
  }

  export function surface(): HTMLElement | null {
    return scroller;
  }

  export function offersGuide(): boolean {
    return offersTouchGuide(pointing);
  }

  export function showGuide(): void {
    touchGuide.recall();
  }

  export function atFitWidth(): boolean {
    return strip.atFitWidth;
  }

  export function shift(screens: number): void {
    const element = scroller;
    if (element === null) return;
    element.scrollBy({
      top: element.clientHeight * SCREEN_OVERLAP * screens,
      behavior: scrollMotion(reducedMotion.current),
    });
  }

  export function canShift(screens: number): boolean {
    if (screens < 0) return scrolled > SETTLED_PX;
    return scrolled + frameHeight < height - SETTLED_PX;
  }

  function onscroll(): void {
    const element = scroller;
    if (element === null) return;

    const top = element.scrollTop;
    const left = element.scrollLeft;

    const ours = written;
    written = null;
    const by = { x: left - scrolledLeft, y: top - scrolled };
    scrolledLeft = left;
    if (
      ours !== null &&
      Math.abs(top - ours.top) < SETTLED_PX &&
      Math.abs(left - ours.left) < SETTLED_PX
    ) {
      scrolled = top;
      return;
    }

    travel = travelBetween(scrolled, top, travel);
    scrolled = top;
    const layer = selection;
    if (layer !== null && layer.dragging()) layer.followScroll(by);
    else layer?.reset();
    strip.settleAt({ top, left });
    moveTo(
      strip.hold.position,
      shownThroughAtScroll(layout, top, element.clientHeight) ?? strip.hold.position.index,
    );
  }

  function onwheel(event: WheelEvent): void {
    const element = scroller;
    if (element === null) return;
    if (!event.ctrlKey && !event.metaKey) return;

    event.preventDefault();
    if (selection?.dragging() ?? false) return;

    const box = element.getBoundingClientRect();
    const dy = wheelPixels(event.deltaY, event.deltaMode, box.height);

    zoomBy(wheelZoomFactor(dy), event.clientX - box.x, event.clientY - box.y);
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;

    if (event.key === 'Escape') {
      selection?.dismiss();
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (handlesOwnKeys(event.target)) return;

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomFromCentre(ZOOM_STEP);
      return;
    }

    if (event.key === '-') {
      event.preventDefault();
      zoomFromCentre(1 / ZOOM_STEP);
      return;
    }

    if (event.key === '0') {
      event.preventDefault();
      fitWidth();
    }
  }

  onDestroy(() => {
    gestures.stop();
    edgeScroll.stop();
  });

  $effect(() => {
    const element = scroller;
    if (element === null) return;

    function ontouchmove(event: TouchEvent): void {
      if (event.cancelable && holdsTheScroll(gestures.state, event.touches.length))
        event.preventDefault();
    }

    element.addEventListener('touchmove', ontouchmove, { passive: false });
    return () => element.removeEventListener('touchmove', ontouchmove);
  });

  $effect.pre(() => {
    const element = scroller;
    if (element === null) return;

    const observer = new ResizeObserver(() => {
      frameWidth = element.clientWidth;
      frameHeight = element.clientHeight;
    });
    observer.observe(element);

    frameWidth = element.clientWidth;
    frameHeight = element.clientHeight;

    return () => observer.disconnect();
  });

  $effect(() => {
    const element = scroller;
    const placed = layout;
    if (element === null || placed.length === 0) return;

    untrack(() =>
      match(relayoutFor(placed, width, strip.reading))
        .with({ kind: 'place' }, () => apply(element))
        .with({ kind: 'follow' }, () => {
          apply(element);
          strip.follow();
        })
        .with({ kind: 'stay' }, () => {
          const top = element.scrollTop;
          strip.settleAt({ top, left: element.scrollLeft });
          moveTo(
            strip.hold.position,
            shownThroughAtScroll(placed, top, element.clientHeight) ?? strip.hold.position.index,
          );
        })
        .exhaustive(),
    );
  });

  $effect(() => {
    const asked = start;

    untrack(() => {
      const element = scroller;
      if (element === null || layout.length === 0) return;
      if (!strip.goTo(asked)) return;

      apply(element);
    });
  });
</script>

<svelte:window {onkeydown} onpointerdowncapture={noticePointer} />

<div class="continuous-viewer relative row gap-0 flex-1 min-h-0 scheme-dark surface-sunken">
  <div
    class={['scroller flex-1 min-h-0 overflow-auto', { 'is-selecting': selecting }]}
    role="region"
    aria-label="Continuous strip"
    bind:this={scroller}
    {onscroll}
    {onwheel}
    {onpointerdown}
    {onpointermove}
    {onpointerup}
    {onpointercancel}
    {oncontextmenu}
  >
    <div class="strip mx-auto" style:--strip-width="{width}px">
      <div class="spacer" style:--spacer-height="{spacers.before}px" aria-hidden="true"></div>
      {#each spacers.slices as slice (slice.index)}
        <div class="slice overflow-hidden" style:--slice-height="{slice.height}px">
          <PageFrame
            index={slice.index}
            label={label(slice.index)}
            {pictureAt}
            {measured}
            glow={glowOn(glow, slice.index)}
            flush
          />
        </div>
      {/each}
      <div class="spacer" style:--spacer-height="{spacers.after}px" aria-hidden="true"></div>
    </div>
  </div>

  <SelectionLayer
    bind:this={selection}
    within={scroller}
    arrangement="column"
    pointerTypes={DRAG_SELECTS_WITH}
    {makes}
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
    <LessonScrim
      class="row items-center justify-center p-4 text-center"
      ondismiss={() => touchGuide.dismiss()}
    >
      <SwipeLine lesson={STRIP_GUIDE} />
    </LessonScrim>
  {/if}
</div>
