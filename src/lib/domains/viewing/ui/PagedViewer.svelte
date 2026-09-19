<script lang="ts">
  import { untrack } from 'svelte';
  import { match } from 'ts-pattern';
  import { isEmpty, screenRect, type ScreenRect, type Size } from '$lib/shared/geometry';
  import { imageIndex, type ImageIndex } from '$lib/shared/ids';
  import type { ImageRegion } from '$lib/shared/image-region';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import type { PageGroup } from '../domain/page-pairing';
  import { regionsIn, type PlacedImage } from '../domain/placement';
  import { isUsableSelection, selectionFrom, type Point } from '../domain/selection';
  import { centrePan, clampPan, fitZoom, panBy, zoomAt, type Viewport } from '../domain/viewport';
  import { handlesOwnKeys } from './keyboard';
  import PageCanvas from './PageCanvas.svelte';

  type Fit = 'height' | 'width' | 'free';

  type Frames = { readonly content: Size; readonly frame: Size };

  type Grab = { readonly id: number; readonly x: number; readonly y: number };

  type Props = {
    readonly pages: PageGroup;
    readonly direction: ReadingDirection;
    readonly imageAt: (index: ImageIndex) => Promise<ImageBitmap | null>;
    readonly select: (regions: readonly ImageRegion[]) => void;
    readonly clear: () => void;
  };

  let { pages, direction, imageAt, select, clear }: Props = $props();

  const ZOOM_STEP = 1.2;
  const WHEEL_ZOOM_SPAN = 320;
  const WHEEL_LINE_PX = 16;
  const FIT_HEIGHT_ZOOM = 1;

  let frame = $state<HTMLDivElement | null>(null);
  let strip = $state<HTMLDivElement | null>(null);
  let viewport = $state.raw<Viewport>({ zoom: FIT_HEIGHT_ZOOM, panX: 0, panY: 0 });
  let fit = $state.raw<Fit>('height');
  let grab = $state.raw<Grab | null>(null);
  let origin = $state.raw<Point | null>(null);
  let anchor = $state.raw<Point | null>(null);
  let pointer = $state.raw<Point | null>(null);
  let held = $state<number | null>(null);
  let committed = $state.raw<ScreenRect | null>(null);
  let captured = $state.raw<Size | null>(null);

  let shownPages: PageGroup | null = null;

  const transform = $derived(
    `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
  );

  const dragged = $derived.by(() => {
    const from = anchor;
    const to = pointer;
    if (from === null || to === null) return null;

    const rect = selectionFrom(from, to);
    return isEmpty(rect) ? null : rect;
  });

  const marquee = $derived(dragged ?? committed);

  const overlay = $derived.by(() => {
    const rect = marquee;
    const corner = origin;
    if (rect === null || corner === null) return null;

    return {
      left: rect.x - corner.x,
      top: rect.y - corner.y,
      width: rect.width,
      height: rect.height,
    };
  });

  const measure = $derived(
    dragged !== null || captured === null ? null : `${captured.width} × ${captured.height}`,
  );

  function label(index: ImageIndex): string {
    return String(index + 1).padStart(3, '0');
  }

  function pointAt(event: PointerEvent): Point {
    return { x: event.clientX, y: event.clientY };
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

  function settle(next: Viewport): void {
    const sizes = framesNow();
    viewport = sizes === null ? next : clampPan(next, sizes.content, sizes.frame);
  }

  function recentre(zoom: number): void {
    const sizes = framesNow();
    const next: Viewport = { zoom, panX: viewport.panX, panY: viewport.panY };
    viewport = sizes === null ? next : centrePan(next, sizes.content, sizes.frame);
  }

  export function fitHeight(): void {
    fit = 'height';
    recentre(FIT_HEIGHT_ZOOM);
  }

  export function fitWidth(): void {
    const sizes = framesNow();
    fit = 'width';
    if (sizes === null) return;
    recentre(fitZoom(sizes.content, sizes.frame, 'width'));
  }

  export function activeFit(): Fit {
    return fit;
  }

  function reapplyFit(): void {
    match(fit)
      .with('height', () => recentre(FIT_HEIGHT_ZOOM))
      .with('width', () => fitWidth())
      .with('free', () => settle(viewport))
      .exhaustive();
  }

  function stepZoom(factor: number): void {
    const sizes = framesNow();
    if (sizes === null) return;

    fit = 'free';
    settle(zoomAt(viewport, factor, sizes.frame.width / 2, sizes.frame.height / 2));
  }

  function scrolled(delta: number, mode: number, extent: number): number {
    if (mode === WheelEvent.DOM_DELTA_LINE) return delta * WHEEL_LINE_PX;
    if (mode === WheelEvent.DOM_DELTA_PAGE) return delta * extent;
    return delta;
  }

  function forget(): void {
    committed = null;
    captured = null;
  }

  function release(id: number): void {
    const element = frame;
    if (element !== null && element.hasPointerCapture(id)) element.releasePointerCapture(id);
  }

  function stopDrag(): void {
    const id = held;
    if (id !== null) release(id);
    held = null;
    anchor = null;
    pointer = null;
  }

  function stopGrab(): void {
    const moving = grab;
    if (moving === null) return;
    release(moving.id);
    grab = null;
  }

  function placementsIn(element: HTMLElement): readonly PlacedImage[] {
    const placed: PlacedImage[] = [];

    for (const canvas of element.querySelectorAll('canvas[data-image-index]')) {
      if (!(canvas instanceof HTMLCanvasElement)) continue;

      const index = Number(canvas.dataset.imageIndex);
      if (!Number.isInteger(index)) continue;

      const box = canvas.getBoundingClientRect();
      placed.push({
        index: imageIndex(index),
        onScreen: screenRect(box.x, box.y, box.width, box.height),
        natural: { width: canvas.width, height: canvas.height },
      });
    }

    return placed;
  }

  function naturalSize(regions: readonly ImageRegion[]): Size {
    let width = 0;
    let height = 0;

    for (const region of regions) {
      width += region.rect.width;
      height = Math.max(height, region.rect.height);
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  function onwheel(event: WheelEvent): void {
    const element = frame;
    if (element === null) return;

    event.preventDefault();
    const box = element.getBoundingClientRect();
    const dx = scrolled(event.deltaX, event.deltaMode, box.width);
    const dy = scrolled(event.deltaY, event.deltaMode, box.height);

    if (event.ctrlKey || event.metaKey) {
      fit = 'free';
      settle(
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

  function onpointerdown(event: PointerEvent): void {
    const element = frame;
    if (element === null) return;

    if (event.button === 1) {
      grab = { id: event.pointerId, x: event.clientX, y: event.clientY };
      element.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (!event.isPrimary || event.button !== 0) return;

    const box = element.getBoundingClientRect();
    origin = { x: box.x, y: box.y };
    anchor = pointAt(event);
    pointer = anchor;
    held = event.pointerId;
    forget();
    clear();
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onpointermove(event: PointerEvent): void {
    const moving = grab;
    if (moving !== null && moving.id === event.pointerId) {
      grab = { id: moving.id, x: event.clientX, y: event.clientY };
      settle(panBy(viewport, event.clientX - moving.x, event.clientY - moving.y));
      return;
    }

    if (held !== event.pointerId || anchor === null) return;
    pointer = pointAt(event);
  }

  function onpointerup(event: PointerEvent): void {
    if (grab !== null && grab.id === event.pointerId) {
      stopGrab();
      return;
    }

    if (held !== event.pointerId) return;

    const element = frame;
    const from = anchor;
    const to = pointAt(event);
    stopDrag();
    if (element === null || from === null) return;

    const selection = selectionFrom(from, to);
    if (!isUsableSelection(selection)) return;

    const regions = regionsIn(placementsIn(element), selection);
    if (regions.length === 0) return;

    committed = selection;
    captured = naturalSize(regions);
    select(regions);
  }

  function onpointercancel(event: PointerEvent): void {
    if (grab !== null && grab.id === event.pointerId) {
      stopGrab();
      return;
    }

    if (held !== event.pointerId) return;
    stopDrag();
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;

    if (event.key === 'Escape') {
      if (anchor === null && committed === null) return;
      stopDrag();
      forget();
      clear();
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (handlesOwnKeys(event.target)) return;

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
      stopDrag();
      stopGrab();
      forget();
      recentre(viewport.zoom);
    });
  });
</script>

<svelte:window {onkeydown} />

<div class="viewer">
  <div
    class="frame"
    class:grabbing={grab !== null}
    role="group"
    aria-label="Pages in view"
    bind:this={frame}
    {onwheel}
    {onpointerdown}
    {onpointermove}
    {onpointerup}
    {onpointercancel}
  >
    <div class="strip" class:rtl={direction === 'rtl'} bind:this={strip} style:transform>
      {#each pages as index (index)}
        <PageCanvas {index} label={label(index)} load={imageAt} />
      {/each}
    </div>

    {#if overlay !== null}
      <div
        class="marquee"
        style:left="{overlay.left}px"
        style:top="{overlay.top}px"
        style:width="{overlay.width}px"
        style:height="{overlay.height}px"
        aria-hidden="true"
      >
        <span class="handle north west"></span>
        <span class="handle north east"></span>
        <span class="handle south west"></span>
        <span class="handle south east"></span>
        {#if measure !== null}
          <p class="size">{measure}</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .viewer {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: var(--s-5);
    background: var(--c-viewer-gradient);
  }

  .frame {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    align-items: stretch;
    justify-content: flex-start;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    cursor: crosshair;
    touch-action: none;
  }

  .frame.grabbing {
    cursor: grabbing;
  }

  .strip {
    display: flex;
    flex: none;
    flex-direction: row;
    align-items: stretch;
    height: 100%;
    transform-origin: 0 0;
  }

  .strip.rtl {
    flex-direction: row-reverse;
  }

  .marquee {
    position: absolute;
    z-index: var(--z-marquee);
    border: 2px solid var(--c-accent);
    background: var(--c-accent-wash);
    pointer-events: none;
  }

  .handle {
    position: absolute;
    display: block;
    width: 9px;
    height: 9px;
    border: 1px solid var(--c-surface-void);
    background: var(--c-accent);
  }

  .north {
    top: -6px;
  }

  .south {
    bottom: -6px;
  }

  .west {
    left: -6px;
  }

  .east {
    right: -6px;
  }

  .size {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin: 0 0 var(--s-1);
    padding: var(--s-1) var(--s-2);
    border-radius: var(--r-sm);
    background: var(--c-surface-popover);
    color: var(--c-accent);
    font-family: var(--f-mono);
    font-size: 10.5px;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
</style>
