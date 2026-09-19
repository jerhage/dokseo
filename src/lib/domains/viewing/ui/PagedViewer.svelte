<script lang="ts">
  import { isEmpty, screenRect, type ScreenRect, type Size } from '$lib/shared/geometry';
  import { imageIndex, type ImageIndex } from '$lib/shared/ids';
  import type { ImageRegion } from '$lib/shared/image-region';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import type { PageGroup } from '../domain/page-pairing';
  import { regionsIn, type PlacedImage } from '../domain/placement';
  import { isUsableSelection, selectionFrom, type Point } from '../domain/selection';
  import PageCanvas from './PageCanvas.svelte';

  type Props = {
    readonly pages: PageGroup;
    readonly direction: ReadingDirection;
    readonly imageAt: (index: ImageIndex) => Promise<ImageBitmap | null>;
    readonly select: (regions: readonly ImageRegion[]) => void;
    readonly clear: () => void;
  };

  let { pages, direction, imageAt, select, clear }: Props = $props();

  let viewer = $state<HTMLDivElement | null>(null);
  let origin = $state.raw<Point | null>(null);
  let anchor = $state.raw<Point | null>(null);
  let pointer = $state.raw<Point | null>(null);
  let held = $state<number | null>(null);
  let committed = $state.raw<ScreenRect | null>(null);
  let captured = $state.raw<Size | null>(null);

  let shownPages: PageGroup | null = null;

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

  function forget(): void {
    committed = null;
    captured = null;
  }

  function stopDrag(): void {
    const element = viewer;
    const id = held;
    if (element !== null && id !== null && element.hasPointerCapture(id)) {
      element.releasePointerCapture(id);
    }
    held = null;
    anchor = null;
    pointer = null;
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

  function onpointerdown(event: PointerEvent): void {
    const element = viewer;
    if (element === null || !event.isPrimary || event.button !== 0) return;

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
    if (held !== event.pointerId || anchor === null) return;
    pointer = pointAt(event);
  }

  function onpointerup(event: PointerEvent): void {
    if (held !== event.pointerId) return;

    const element = viewer;
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
    if (held !== event.pointerId) return;
    stopDrag();
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.key !== 'Escape') return;
    if (anchor === null && committed === null) return;

    stopDrag();
    forget();
    clear();
  }

  $effect(() => {
    const group = pages;
    if (group === shownPages) return;

    shownPages = group;
    stopDrag();
    forget();
  });
</script>

<svelte:window {onkeydown} />

<div
  class="viewer"
  role="group"
  aria-label="Pages in view"
  bind:this={viewer}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  {onpointercancel}
>
  <div class="strip" class:rtl={direction === 'rtl'}>
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

<style>
  .viewer {
    position: relative;
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-height: 0;
    overflow: hidden;
    padding: var(--s-5);
    background: var(--c-viewer-gradient);
    cursor: crosshair;
    touch-action: none;
  }

  .strip {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    height: 100%;
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
