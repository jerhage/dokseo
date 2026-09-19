<script lang="ts">
  import { untrack } from 'svelte';
  import type { Size } from '$lib/shared/geometry';
  import type { ImageIndex } from '$lib/shared/ids';
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
  import PageCanvas from './PageCanvas.svelte';

  type Hold = {
    readonly position: ReadingPosition;
    readonly top: number;
    readonly across: number;
    readonly left: number;
  };

  type Props = {
    readonly sizes: readonly (Size | null)[];
    readonly start: ReadingPosition;
    readonly imageAt: (index: ImageIndex) => Promise<ImageBitmap | null>;
    readonly moveTo: (position: ReadingPosition) => void;
  };

  let { sizes, start, imageAt, moveTo }: Props = $props();

  const ZOOM_STEP = 1.2;
  const WHEEL_ZOOM_SPAN = 320;
  const WHEEL_LINE_PX = 16;
  const FIT_WIDTH_ZOOM = 1;
  const SCREEN_OVERLAP = 0.9;
  const SETTLED_PX = 0.5;

  let scroller = $state<HTMLDivElement | null>(null);
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

    hold = holdAt(top, left);
    moveTo(hold.position);
  }

  function onwheel(event: WheelEvent): void {
    const element = scroller;
    if (element === null) return;
    if (!event.ctrlKey && !event.metaKey) return;

    event.preventDefault();
    const box = element.getBoundingClientRect();
    const dy = wheelPixels(event.deltaY, event.deltaMode, box.height);

    zoomBy(Math.exp(-dy / WHEEL_ZOOM_SPAN), event.clientX - box.x, event.clientY - box.y);
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
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
</script>

<svelte:window {onkeydown} />

<div class="viewer">
  <div
    class="scroller"
    role="region"
    aria-label="Continuous strip"
    bind:this={scroller}
    {onscroll}
    {onwheel}
  >
    <div class="strip" style:width="{width}px">
      <div class="spacer" style:height="{spacers.before}px" aria-hidden="true"></div>
      {#each spacers.slices as slice (slice.index)}
        <div class="slice" style:height="{slice.height}px">
          <PageCanvas index={slice.index} label={label(slice.index)} load={imageAt} flush />
        </div>
      {/each}
      <div class="spacer" style:height="{spacers.after}px" aria-hidden="true"></div>
    </div>
  </div>
</div>

<style>
  .viewer {
    display: flex;
    flex: 1;
    min-height: 0;
    background: var(--c-viewer-gradient);
  }

  .scroller {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    overflow: auto;
    overflow-anchor: none;
    scrollbar-gutter: stable;
    overscroll-behavior: contain;
  }

  .scroller:focus-visible {
    outline: 1px solid var(--c-accent-border-strong);
    outline-offset: -1px;
  }

  .strip {
    margin: 0 auto;
  }

  .slice {
    display: block;
    overflow: hidden;
  }

  .spacer {
    display: block;
  }
</style>
