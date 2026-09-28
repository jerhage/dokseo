<script lang="ts">
  import { untrack } from 'svelte';
  import { match } from 'ts-pattern';
  import KeyHints from '$lib/components/KeyHints.svelte';
  import type { GestureInput, GestureSample } from '$lib/components/gesture';
  import { GestureFeed } from '$lib/components/gesture-feed';
  import {
    ZOOM_STEP,
    clampZoom,
    pinchZoom,
    wheelPixels,
    wheelZoomFactor,
  } from '$lib/components/pan-zoom';
  import type { CaptureOrigin } from '$lib/shared/capture-origin';
  import type { Size } from '$lib/shared/geometry';
  import type { ImageIndex } from '$lib/shared/ids';
  import type { GlowRegion, ImageRegion } from '$lib/shared/image-region';
  import type { PagePicture } from '$lib/shared/page-source';
  import type { ReadingPosition } from '../domain/reading-position';
  import {
    anchorOf,
    layOutStrip,
    positionAtScroll,
    relayoutFor,
    scrollForPosition,
    shownThroughAtScroll,
    spacersFor,
    stripHeight,
    stripWindow,
    travelBetween,
  } from '../domain/strip';
  import type { StripAnchor, Travel } from '../domain/strip';
  import type { Point } from '../domain/selection';
  import { heldHints, hintsToShow, inputKind, readerHints } from './gesture-hint';
  import type { GestureHint } from './gesture-hint';
  import { handlesOwnKeys } from './keyboard';
  import { hintsWanted, learnedGestures, learnGesture } from './learned-gestures.svelte';
  import { glowOn } from './page-glow';
  import PageFrame from './PageFrame.svelte';
  import SelectionLayer from './SelectionLayer.svelte';
  import { holdsTheScroll, stripTouchAction } from './strip-touch';
  import type { StripTouchAction } from './strip-touch';
  import './continuous-viewer.css';

  type Hold = {
    readonly position: ReadingPosition;
    readonly top: number;
    readonly across: number;
    readonly left: number;
  };

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

  const FIT_WIDTH_ZOOM = 1;
  const SCREEN_OVERLAP = 0.9;
  const SETTLED_PX = 0.5;
  const DRAG_SELECTS_WITH = ['mouse', 'pen'];

  let scroller = $state<HTMLDivElement | null>(null);
  let selection = $state<ReturnType<typeof SelectionLayer> | null>(null);
  let frameWidth = $state(0);
  let frameHeight = $state(0);
  let scrolled = $state(0);
  let zoom = $state(FIT_WIDTH_ZOOM);
  let travel = $state<Travel>('down');
  let hold = $state.raw<Hold>({
    position: untrack(() => start),
    top: 0,
    across: 0,
    left: 0,
  });

  let lastPointerType = $state<string | null>(null);
  let heldLines: readonly GestureHint[] = [];

  let written: { readonly top: number; readonly left: number } | null = null;
  let reading: StripAnchor | null = null;
  let lastPointer = '';

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const gestures = new GestureFeed(feed);

  const width = $derived(frameWidth * zoom);
  const layout = $derived(layOutStrip(sizes, width));
  const height = $derived(stripHeight(layout));
  const range = $derived(stripWindow(layout, scrolled, frameHeight, travel));
  const spacers = $derived(spacersFor(layout, range, snapToDevicePixels));
  const pointing = $derived(inputKind(lastPointerType, coarse));
  const pending = $derived(
    hintsToShow(
      readerHints({
        input: pointing,
        layoutKind: 'continuous',
        pannable: false,
        turns: 'swipe-only',
      }),
      learnedGestures(),
      { chromeShown, wanted: hintsWanted(), revealed: false, input: pointing },
    ),
  );
  const hintLines = $derived.by(() => {
    heldLines = heldHints(heldLines, pending);
    return heldLines;
  });

  function snapToDevicePixels(value: number): number {
    const ratio = window.devicePixelRatio;
    if (!Number.isFinite(ratio) || ratio <= 0) return value;
    return Math.round(value * ratio) / ratio;
  }

  function label(index: ImageIndex): string {
    return String(index + 1).padStart(3, '0');
  }

  function holdAt(top: number, left: number): Hold {
    return {
      position: positionAtScroll(layout, top) ?? hold.position,
      top: 0,
      across: width > 0 ? left / width : 0,
      left: 0,
    };
  }

  function apply(element: HTMLElement, anchor: Hold): void {
    const top = scrollForPosition(layout, anchor.position) - anchor.top;
    const left = width * anchor.across - anchor.left;
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
  }

  function zoomBy(factor: number, x: number, y: number): void {
    const element = scroller;
    if (element === null) return;

    const next = clampZoom(zoom * factor);
    if (next === zoom) return;

    const top = element.scrollTop;
    const left = element.scrollLeft;

    reading = null;
    hold = {
      position: positionAtScroll(layout, top + y) ?? hold.position,
      top: y,
      across: width > 0 ? (left + x) / width : 0,
      left: x,
    };
    zoom = next;
  }

  function pinchBy(scale: number, from: Point, to: Point): void {
    const element = scroller;
    if (element === null) return;

    const box = element.getBoundingClientRect();
    const was = { x: from.x - box.left, y: from.y - box.top };
    const now = { x: to.x - box.left, y: to.y - box.top };
    const top = element.scrollTop;
    const left = element.scrollLeft;

    reading = null;
    hold = {
      position: positionAtScroll(layout, top + was.y) ?? hold.position,
      top: now.y,
      across: width > 0 ? (left + was.x) / width : 0,
      left: now.x,
    };

    const next = pinchZoom(zoom, scale, FIT_WIDTH_ZOOM);
    if (next === zoom) {
      apply(element, hold);
      return;
    }
    zoom = next;
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

  function onpointerdown(event: PointerEvent): void {
    lastPointer = event.pointerType;
    if (event.pointerType === 'touch') {
      feedTouch('down', event);
      return;
    }

    selection?.pointerdown(event);
  }

  function onpointermove(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      feedTouch('move', event);
      return;
    }

    selection?.pointermove(event);
  }

  function onpointerup(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      feedTouch('up', event);
      return;
    }

    selection?.pointerup(event);
  }

  function onpointercancel(event: PointerEvent): void {
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
    zoomFromCentre(FIT_WIDTH_ZOOM / zoom);
  }

  export function surface(): HTMLElement | null {
    return scroller;
  }

  export function atFitWidth(): boolean {
    return zoom === FIT_WIDTH_ZOOM;
  }

  export function shift(screens: number): void {
    const element = scroller;
    if (element === null) return;
    element.scrollBy({ top: element.clientHeight * SCREEN_OVERLAP * screens, behavior: 'smooth' });
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
    selection?.reset();
    hold = holdAt(top, left);
    reading = anchorOf(layout, width, hold.position.index);
    moveTo(
      hold.position,
      shownThroughAtScroll(layout, top, element.clientHeight) ?? hold.position.index,
    );
  }

  function onwheel(event: WheelEvent): void {
    const element = scroller;
    if (element === null) return;

    if (selection?.dragging() ?? false) {
      event.preventDefault();
      return;
    }

    if (!event.ctrlKey && !event.metaKey) return;

    event.preventDefault();
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

  $effect(() => () => gestures.stop());

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

  $effect(() => {
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
      match(relayoutFor(placed, width, reading))
        .with({ kind: 'place' }, () => apply(element, hold))
        .with({ kind: 'follow' }, () => {
          apply(element, hold);
          reading = anchorOf(placed, width, hold.position.index);
        })
        .with({ kind: 'stay' }, () => {
          const top = element.scrollTop;
          hold = holdAt(top, element.scrollLeft);
          reading = anchorOf(placed, width, hold.position.index);
          moveTo(
            hold.position,
            shownThroughAtScroll(placed, top, element.clientHeight) ?? hold.position.index,
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
      if (asked.index === hold.position.index) return;

      reading = null;
      hold = { position: asked, top: 0, across: hold.across, left: 0 };
      apply(element, hold);
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
    hints={hintLines}
    size="sm"
    decorative
    class={[
      'pin-bottom pin-lift z-sticky pass-through px-3 py-2 hushable',
      { 'is-hushed': pending.length === 0 },
    ]}
  />
</div>
