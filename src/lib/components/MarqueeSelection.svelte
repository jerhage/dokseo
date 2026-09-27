<script lang="ts">
  import { match } from 'ts-pattern';
  import {
    endsInClick,
    marqueeBox,
    marqueeEnd,
    marqueePress,
    stayedPut,
  } from './marquee-selection';
  import type {
    MarqueeEnd,
    MarqueePoint,
    MarqueePointers,
    MarqueeRect,
    MarqueeRefusal,
    MarqueeStroke,
  } from './marquee-selection';

  type Watch = {
    readonly id: number;
    readonly from: MarqueePoint;
    readonly strayed: boolean;
  };

  type Props = {
    readonly within: HTMLElement | null;
    readonly pointerTypes: MarqueePointers;
    readonly slop: (pointerType: string) => number;
    readonly minimum: number;
    readonly suppressed?: boolean;
    readonly note?: boolean;
    readonly label?: string | null;
    readonly onstart?: () => void;
    readonly onend?: (end: MarqueeEnd, stroke: MarqueeStroke) => void;
    readonly onrefuse?: (refusal: MarqueeRefusal) => void;
    readonly onclick?: () => void;
    readonly ondismiss?: () => void;
  };

  let {
    within,
    pointerTypes,
    slop,
    minimum,
    suppressed = false,
    note = false,
    label = null,
    onstart,
    onend,
    onrefuse,
    onclick,
    ondismiss,
  }: Props = $props();

  const DRIVEN_POINTER = 'touch';

  let host = $state<HTMLDivElement | null>(null);
  let corner = $state.raw<MarqueePoint | null>(null);
  let anchor = $state.raw<MarqueePoint | null>(null);
  let pointer = $state.raw<MarqueePoint | null>(null);
  let held = $state<number | null>(null);
  let kept = $state.raw<MarqueeRect | null>(null);
  let watch = $state.raw<Watch | null>(null);

  const box = $derived.by(() => {
    const from = anchor;
    const to = pointer;
    const origin = corner;
    if (from === null || to === null || origin === null) return null;

    return marqueeBox(from, to, origin);
  });

  function pointAt(event: PointerEvent): MarqueePoint {
    return { x: event.clientX, y: event.clientY };
  }

  function onContent(element: HTMLElement, event: PointerEvent): boolean {
    const placed = element.getBoundingClientRect();
    return (
      event.clientX - placed.left <= element.clientWidth &&
      event.clientY - placed.top <= element.clientHeight
    );
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

  function begin(layer: HTMLDivElement, id: number, from: MarqueePoint, to: MarqueePoint): void {
    const placed = layer.getBoundingClientRect();
    corner = { x: placed.x, y: placed.y };
    anchor = from;
    pointer = to;
    held = id;
    kept = null;
    onstart?.();
  }

  function conclude(
    released: number,
    to: MarqueePoint,
    pointerType: string,
    clicks: boolean,
  ): void {
    const id = held;
    if (id === null) return;
    if (id !== released) {
      onrefuse?.({ kind: 'pointer-mismatch', held: id, released });
      return;
    }

    const surface = within;
    const from = anchor;
    stopDrag();
    if (surface === null || from === null) {
      onrefuse?.({
        kind: 'no-drag-origin',
        hasSurface: surface !== null,
        hasAnchor: from !== null,
      });
      return;
    }

    const end = marqueeEnd(from, to, slop(pointerType), minimum);
    onend?.(end, { from, to, surface });
    if (clicks && endsInClick(end)) onclick?.();
  }

  export function dragging(): boolean {
    return held !== null;
  }

  export function keep(selection: MarqueeRect): void {
    kept = selection;
  }

  export function reset(): void {
    watch = null;
    if (anchor === null && kept === null) return;
    stopDrag();
    kept = null;
  }

  export function dismiss(): void {
    watch = null;
    if (anchor === null && kept === null) return;
    stopDrag();
    kept = null;
    ondismiss?.();
  }

  export function pointerdown(event: PointerEvent): void {
    const element = within;
    const layer = host;
    watch = null;
    if (element === null || layer === null) return;

    const press = marqueePress(
      {
        ready: !suppressed,
        primary: event.isPrimary,
        button: event.button,
        onContent: onContent(element, event),
        pointerType: event.pointerType,
      },
      pointerTypes,
    );
    match(press)
      .with({ kind: 'ignored' }, () => undefined)
      .with({ kind: 'watched' }, () => {
        watch = { id: event.pointerId, from: pointAt(event), strayed: false };
      })
      .with({ kind: 'drawn' }, () => {
        const at = pointAt(event);
        begin(layer, event.pointerId, at, at);
        element.setPointerCapture(event.pointerId);
        event.preventDefault();
      })
      .exhaustive();
  }

  export function pointermove(event: PointerEvent): void {
    const watching = watch;
    if (watching !== null && watching.id === event.pointerId) {
      if (!watching.strayed && !stayedPut(watching.from, pointAt(event), minimum)) {
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
      if (!watching.strayed && stayedPut(watching.from, pointAt(event), minimum)) onclick?.();
      return;
    }

    conclude(event.pointerId, pointAt(event), event.pointerType, true);
  }

  export function pointercancel(event: PointerEvent): void {
    if (watch !== null && watch.id === event.pointerId) {
      watch = null;
      return;
    }

    if (held !== event.pointerId) return;
    stopDrag();
  }

  export function beginAt(id: number, from: MarqueePoint, to: MarqueePoint): void {
    const layer = host;
    watch = null;
    if (within === null || layer === null || suppressed) return;

    begin(layer, id, from, to);
  }

  export function extendTo(at: MarqueePoint): void {
    if (held === null || anchor === null) return;
    pointer = at;
  }

  export function endAt(at: MarqueePoint): void {
    const id = held;
    if (id === null) return;

    conclude(id, at, DRIVEN_POINTER, false);
  }

  export function abandon(): void {
    if (held === null) return;
    stopDrag();
  }
</script>

<div class="marquee-selection" bind:this={host} aria-hidden="true">
  {#if box !== null}
    <div
      class={[
        'marquee-selection-box place-rect region-box z-raised',
        { 'region-box-accent': note },
      ]}
      style:--rect-left="{box.left}px"
      style:--rect-top="{box.top}px"
      style:--rect-width="{box.width}px"
      style:--rect-height="{box.height}px"
    >
      <span
        class="marquee-selection-handle marquee-selection-handle-north marquee-selection-handle-west"
      ></span>
      <span
        class="marquee-selection-handle marquee-selection-handle-north marquee-selection-handle-east"
      ></span>
      <span
        class="marquee-selection-handle marquee-selection-handle-south marquee-selection-handle-west"
      ></span>
      <span
        class="marquee-selection-handle marquee-selection-handle-south marquee-selection-handle-east"
      ></span>
      {#if label !== null}
        <p class="marquee-selection-label mono text-xs surface-raised rounded-control px-2 py-1">
          {label}
        </p>
      {/if}
    </div>
  {/if}
</div>
