<script lang="ts">
  import { beginTrace, type Trace } from '$lib/platform/trace/pipeline-trace';
  import type { Arrangement } from '$lib/shared/arrangement';
  import { isEmpty, normalize, screenRect, type ScreenRect, type Size } from '$lib/shared/geometry';
  import { imageIndex } from '$lib/shared/ids';
  import type { ImageRegion } from '$lib/shared/image-region';
  import { regionsIn, type PlacedImage } from '../domain/placement';
  import {
    isUsableSelection,
    MIN_SELECTION_PX,
    selectionFrom,
    selectionSize,
    type Point,
  } from '../domain/selection';

  type Props = {
    readonly within: HTMLElement | null;
    readonly arrangement: Arrangement;
    readonly pointerTypes: 'any' | readonly string[];
    readonly suppressed?: boolean;
    readonly select: (regions: readonly ImageRegion[]) => void;
    readonly clear: () => void;
    readonly tap: () => void;
  };

  let {
    within,
    arrangement,
    pointerTypes,
    suppressed = false,
    select,
    clear,
    tap,
  }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let origin = $state.raw<Point | null>(null);
  let anchor = $state.raw<Point | null>(null);
  let pointer = $state.raw<Point | null>(null);
  let held = $state<number | null>(null);
  let committed = $state.raw<ScreenRect | null>(null);
  let captured = $state.raw<Size | null>(null);

  const dragged = $derived.by(() => {
    const from = anchor;
    const to = pointer;
    if (from === null || to === null) return null;

    const rect = selectionFrom(from, to);
    return isEmpty(rect) ? null : rect;
  });

  // The committed rect is deliberately left unrendered; `committed`, `captured` and the
  // handles stay because editing a committed selection is planned.
  const marquee = $derived(dragged);

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

  const measure = $derived.by(() => {
    const size = captured;
    if (dragged !== null || size === null) return null;
    return `${Math.round(size.width)} × ${Math.round(size.height)}`;
  });

  function pointAt(event: PointerEvent): Point {
    return { x: event.clientX, y: event.clientY };
  }

  function admits(type: string): boolean {
    return pointerTypes === 'any' || pointerTypes.includes(type);
  }

  function onContent(element: HTMLElement, event: PointerEvent): boolean {
    const box = element.getBoundingClientRect();
    return (
      event.clientX - box.left <= element.clientWidth &&
      event.clientY - box.top <= element.clientHeight
    );
  }

  function placementsIn(element: HTMLElement, trace: Trace): readonly PlacedImage[] {
    const found = element.querySelectorAll('canvas[data-image-index]');
    const placed: PlacedImage[] = [];

    for (const canvas of found) {
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

    trace.step('placements', { canvases: found.length, placed: placed.length });
    for (const image of placed) {
      trace.step('placement', {
        index: image.index,
        naturalWidth: image.natural.width,
        naturalHeight: image.natural.height,
        onScreen: image.onScreen,
      });
    }

    return placed;
  }

  function forget(): void {
    committed = null;
    captured = null;
  }

  function release(id: number): void {
    const element = within;
    if (element !== null && element.hasPointerCapture(id)) element.releasePointerCapture(id);
  }

  function stopDrag(): void {
    const id = held;
    if (id !== null) release(id);
    held = null;
    anchor = null;
    pointer = null;
  }

  export function dragging(): boolean {
    return held !== null;
  }

  export function reset(): void {
    if (anchor === null && committed === null) return;
    stopDrag();
    forget();
  }

  export function dismiss(): void {
    if (anchor === null && committed === null) return;
    stopDrag();
    forget();
    clear();
  }

  export function pointerdown(event: PointerEvent): void {
    const element = within;
    const box = host;
    if (element === null || box === null || suppressed) return;
    if (!event.isPrimary || event.button !== 0) return;
    if (!admits(event.pointerType)) return;
    if (!onContent(element, event)) return;

    const corner = box.getBoundingClientRect();
    origin = { x: corner.x, y: corner.y };
    anchor = pointAt(event);
    pointer = anchor;
    held = event.pointerId;
    forget();
    clear();
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  export function pointermove(event: PointerEvent): void {
    if (held !== event.pointerId || anchor === null) return;
    pointer = pointAt(event);
  }

  export function pointerup(event: PointerEvent): void {
    const id = held;
    if (id === null) return;

    const trace = beginTrace('selection');
    try {
      if (id !== event.pointerId) {
        trace.step('stopped', { guard: 'pointer-mismatch', held: id, released: event.pointerId });
        return;
      }

      const element = within;
      const from = anchor;
      const to = pointAt(event);
      stopDrag();
      if (element === null || from === null) {
        trace.step('stopped', {
          guard: 'no-drag-origin',
          hasWithin: element !== null,
          hasAnchor: from !== null,
        });
        return;
      }

      const selection = selectionFrom(from, to);
      trace.step('pointer', { from, to, selection });

      const measured = normalize(selection);
      const usable = isUsableSelection(selection);
      trace.step('usable', {
        usable,
        width: measured.width,
        height: measured.height,
        minimum: MIN_SELECTION_PX,
      });
      if (!usable) {
        trace.step('stopped', { guard: 'below-minimum' });
        tap();
        return;
      }

      const regions = regionsIn(placementsIn(element, trace), selection);
      trace.step('regions', { count: regions.length });
      for (const region of regions) {
        trace.step('region', { index: region.index, rect: region.rect });
      }
      if (regions.length === 0) {
        trace.step('stopped', { guard: 'no-regions' });
        tap();
        return;
      }

      committed = selection;
      captured = selectionSize(regions, arrangement);
      trace.step('selected', { regions: regions.length, size: captured });
      select(regions);
    } finally {
      trace.end();
    }
  }

  export function pointercancel(event: PointerEvent): void {
    if (held !== event.pointerId) return;
    stopDrag();
  }
</script>

<div class="layer" bind:this={host} aria-hidden="true">
  {#if overlay !== null}
    <div
      class="marquee"
      style:left="{overlay.left}px"
      style:top="{overlay.top}px"
      style:width="{overlay.width}px"
      style:height="{overlay.height}px"
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
  .layer {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
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
    border-radius: var(--r-1);
    background: var(--c-surface-popover);
    color: var(--c-accent);
    font-family: var(--f-mono);
    font-size: 10.5px;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
</style>
