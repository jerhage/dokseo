<script lang="ts">
  import { untrack } from 'svelte';
  import type { CaptureOrigin } from '$lib/shared/capture-origin';
  import type { Size } from '$lib/shared/geometry';
  import type { ImageIndex } from '$lib/shared/ids';
  import type { GlowRegion, ImageRegion } from '$lib/shared/image-region';
  import type { PagePicture } from '$lib/shared/page-source';
  import type { ReadingPosition } from '../domain/reading-position';
  import {
    layOutStrip,
    positionAtScroll,
    scrollForPosition,
    spacersFor,
    stripHeight,
    stripOverscan,
    visibleRange,
  } from '../domain/strip';
  import { clampZoom } from '../domain/viewport';
  import { handlesOwnKeys } from './keyboard';
  import { glowOn } from './page-glow';
  import PageFrame from './PageFrame.svelte';
  import SelectionLayer from './SelectionLayer.svelte';
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
    readonly moveTo: (position: ReadingPosition) => void;
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
    moveTo,
    select,
    clear,
    onTap,
  }: Props = $props();

  const ZOOM_STEP = 1.2;
  const WHEEL_ZOOM_SPAN = 320;
  const WHEEL_LINE_PX = 16;
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
  let hold = $state.raw<Hold>({
    position: untrack(() => start),
    top: 0,
    across: 0,
    left: 0,
  });

  let written: { readonly top: number; readonly left: number } | null = null;

  const width = $derived(frameWidth * zoom);
  const layout = $derived(layOutStrip(sizes, width));
  const height = $derived(stripHeight(layout));
  const range = $derived(visibleRange(layout, scrolled, frameHeight, stripOverscan(frameHeight)));
  const spacers = $derived(spacersFor(layout, range, snapToDevicePixels));

  function snapToDevicePixels(value: number): number {
    const ratio = window.devicePixelRatio;
    if (!Number.isFinite(ratio) || ratio <= 0) return value;
    return Math.round(value * ratio) / ratio;
  }

  function label(index: ImageIndex): string {
    return String(index + 1).padStart(3, '0');
  }

  function wheelPixels(delta: number, mode: number, extent: number): number {
    if (mode === WheelEvent.DOM_DELTA_LINE) return delta * WHEEL_LINE_PX;
    if (mode === WheelEvent.DOM_DELTA_PAGE) return delta * extent;
    return delta;
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

    hold = {
      position: positionAtScroll(layout, top + y) ?? hold.position,
      top: y,
      across: width > 0 ? (left + x) / width : 0,
      left: x,
    };
    zoom = next;
  }

  function zoomFromCentre(factor: number): void {
    const element = scroller;
    if (element === null) return;
    zoomBy(factor, element.clientWidth / 2, element.clientHeight / 2);
  }

  export function fitWidth(): void {
    zoomFromCentre(FIT_WIDTH_ZOOM / zoom);
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
    scrolled = top;

    const ours = written;
    written = null;
    if (
      ours !== null &&
      Math.abs(top - ours.top) < SETTLED_PX &&
      Math.abs(left - ours.left) < SETTLED_PX
    ) {
      return;
    }

    selection?.reset();
    hold = holdAt(top, left);
    moveTo(hold.position);
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

    zoomBy(Math.exp(-dy / WHEEL_ZOOM_SPAN), event.clientX - box.x, event.clientY - box.y);
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

    untrack(() => apply(element, hold));
  });

  $effect(() => {
    const asked = start;

    untrack(() => {
      const element = scroller;
      if (element === null || layout.length === 0) return;
      if (asked.index === hold.position.index) return;

      hold = { position: asked, top: 0, across: hold.across, left: 0 };
      apply(element, hold);
    });
  });
</script>

<svelte:window {onkeydown} />

<div class="continuous-viewer relative row gap-0 flex-1 min-h-0 scheme-dark surface-sunken">
  <div
    class="scroller flex-1 min-h-0 overflow-auto"
    role="region"
    aria-label="Continuous strip"
    bind:this={scroller}
    {onscroll}
    {onwheel}
    onpointerdown={(event) => selection?.pointerdown(event)}
    onpointermove={(event) => selection?.pointermove(event)}
    onpointerup={(event) => selection?.pointerup(event)}
    onpointercancel={(event) => selection?.pointercancel(event)}
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
    {select}
    {clear}
    tap={onTap}
  />
</div>
