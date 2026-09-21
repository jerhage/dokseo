<script lang="ts">
  import { match } from 'ts-pattern';
  import { beginTrace } from '$lib/platform/trace/pipeline-trace';
  import type { Trace } from '$lib/platform/trace/pipeline-trace';
  import type { Arrangement } from '$lib/shared/arrangement';
  import type { CaptureOrigin } from '$lib/shared/capture-origin';
  import { isEmpty, normalize } from '$lib/shared/geometry';
  import type { ScreenRect, Size } from '$lib/shared/geometry';
  import type { ImageRegion } from '$lib/shared/image-region';
  import { regionsIn } from '../domain/placement';
  import type { PlacedImage } from '../domain/placement';
  import {
    dragEnded,
    isTap,
    MIN_SELECTION_PX,
    selectionFrom,
    selectionSize,
  } from '../domain/selection';
  import type { Point } from '../domain/selection';
  import { placedImages } from './page-placements';

  type Watch = {
    readonly id: number;
    readonly from: Point;
    readonly strayed: boolean;
  };

  type Props = {
    readonly within: HTMLElement | null;
    readonly arrangement: Arrangement;
    readonly pointerTypes: 'any' | readonly string[];
    readonly makes?: CaptureOrigin;
    readonly suppressed?: boolean;
    readonly select: (regions: readonly ImageRegion[]) => void;
    readonly clear: () => void;
    readonly tap: () => void;
  };

  let {
    within,
    arrangement,
    pointerTypes,
    makes = 'recognized',
    suppressed = false,
    select,
    clear,
    tap,
  }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let corner = $state.raw<Point | null>(null);
  let anchor = $state.raw<Point | null>(null);
  let pointer = $state.raw<Point | null>(null);
  let held = $state<number | null>(null);
  let committed = $state.raw<ScreenRect | null>(null);
  let watch = $state.raw<Watch | null>(null);
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

  const noting = $derived(makes === 'written');

  const overlay = $derived.by(() => {
    const rect = marquee;
    const from = corner;
    if (rect === null || from === null) return null;

    return {
      left: rect.x - from.x,
      top: rect.y - from.y,
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
    const found = element.querySelectorAll('[data-image-index]');
    const placed = placedImages(found);

    trace.step('placements', { elements: found.length, placed: placed.length });
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
    watch = null;
    if (anchor === null && committed === null) return;
    stopDrag();
    forget();
  }

  export function dismiss(): void {
    watch = null;
    if (anchor === null && committed === null) return;
    stopDrag();
    forget();
    clear();
  }

  export function pointerdown(event: PointerEvent): void {
    const element = within;
    const box = host;
    watch = null;
    if (element === null || box === null || suppressed) return;
    if (!event.isPrimary || event.button !== 0) return;
    if (!onContent(element, event)) return;

    if (!admits(event.pointerType)) {
      watch = { id: event.pointerId, from: pointAt(event), strayed: false };
      return;
    }

    const placed = box.getBoundingClientRect();
    corner = { x: placed.x, y: placed.y };
    anchor = pointAt(event);
    pointer = anchor;
    held = event.pointerId;
    forget();
    clear();
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  export function pointermove(event: PointerEvent): void {
    const watching = watch;
    if (watching !== null && watching.id === event.pointerId) {
      if (!watching.strayed && !isTap(watching.from, pointAt(event))) {
        watch = { ...watching, strayed: true };
      }
      return;
    }

    if (held !== event.pointerId || anchor === null) return;
    pointer = pointAt(event);
  }

  export function pointerup(event: PointerEvent): void {
    const watching = watch;
    if (watching !== null && watching.id === event.pointerId) {
      watch = null;
      if (!watching.strayed && isTap(watching.from, pointAt(event))) tap();
      return;
    }

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

      const ended = dragEnded(from, to);
      trace.step('pointer', { from, to, kind: ended.kind });

      match(ended)
        .with({ kind: 'click' }, () => {
          tap();
        })
        .with({ kind: 'too-small' }, ({ selection }) => {
          const measured = normalize(selection);
          trace.step('stopped', {
            guard: 'below-minimum',
            width: measured.width,
            height: measured.height,
            minimum: MIN_SELECTION_PX,
          });
        })
        .with({ kind: 'selection' }, ({ selection }) => {
          const regions = regionsIn(placementsIn(element, trace), selection);
          trace.step('regions', { count: regions.length });
          for (const region of regions) {
            trace.step('region', { index: region.index, rect: region.rect });
          }
          if (regions.length === 0) {
            trace.step('stopped', { guard: 'no-regions' });
            return;
          }

          committed = selection;
          captured = selectionSize(regions, arrangement);
          trace.step('selected', { regions: regions.length, size: captured });
          select(regions);
        })
        .exhaustive();
    } finally {
      trace.end();
    }
  }

  export function pointercancel(event: PointerEvent): void {
    if (watch !== null && watch.id === event.pointerId) {
      watch = null;
      return;
    }

    if (held !== event.pointerId) return;
    stopDrag();
  }
</script>

<div class="layer" bind:this={host} aria-hidden="true">
  {#if overlay !== null}
    <div
      class="marquee"
      class:noting
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

  .marquee.noting {
    border-color: var(--c-note);
    background: var(--c-note-wash);
  }

  .marquee.noting .handle {
    background: var(--c-note);
  }

  .marquee.noting .size {
    color: var(--c-note);
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
