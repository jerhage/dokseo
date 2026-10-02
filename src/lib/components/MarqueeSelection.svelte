<script lang="ts">
  import { match } from 'ts-pattern';
  import { MarqueeDrag } from './marquee-drag.svelte';
  import type {
    MarqueeEnd,
    MarqueePoint,
    MarqueePointers,
    MarqueeRect,
    MarqueeRefusal,
    MarqueeStroke,
  } from './marquee-selection';

  type Props = {
    readonly within: HTMLElement | null;
    readonly pointerTypes: MarqueePointers;
    readonly slop: (pointerType: string) => number;
    readonly minimum: number;
    readonly suppressed?: boolean;
    readonly accent?: boolean;
    readonly label?: string | undefined;
    readonly onstart?: () => void;
    readonly ondraw?: (selection: MarqueeRect) => void;
    readonly onend?: (end: MarqueeEnd, stroke: MarqueeStroke) => void;
    readonly onrefuse?: (refusal: MarqueeRefusal) => void;
    readonly onclick?: (at: MarqueePoint) => void;
    readonly ondismiss?: () => void;
  };

  let {
    within,
    pointerTypes,
    slop,
    minimum,
    suppressed = false,
    accent = false,
    label,
    onstart,
    ondraw,
    onend,
    onrefuse,
    onclick,
    ondismiss,
  }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);

  const drag = new MarqueeDrag({
    surface: () => within,
    release,
    pointerTypes: () => pointerTypes,
    slop: (pointerType) => slop(pointerType),
    minimum: () => minimum,
    suppressed: () => suppressed,
    onstart: () => onstart?.(),
    ondraw: (selection) => ondraw?.(selection),
    onend: (end, stroke) => onend?.(end, stroke),
    onrefuse: (refusal) => onrefuse?.(refusal),
    onclick: (at) => onclick?.(at),
    ondismiss: () => ondismiss?.(),
  });

  const box = $derived(drag.box);

  function pointAt(event: PointerEvent): MarqueePoint {
    return { x: event.clientX, y: event.clientY };
  }

  function cornerOf(layer: HTMLDivElement): MarqueePoint {
    const placed = layer.getBoundingClientRect();
    return { x: placed.x, y: placed.y };
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

  export function dragging(): boolean {
    return drag.dragging;
  }

  export function followScroll(by: MarqueePoint): void {
    drag.followScroll(by);
  }

  export function keep(selection: MarqueeRect): void {
    drag.keep(selection);
  }

  export function reset(): void {
    drag.reset();
  }

  export function dismiss(): void {
    drag.dismiss();
  }

  export function pointerdown(event: PointerEvent): void {
    const element = within;
    const layer = host;
    drag.unwatch();
    if (element === null || layer === null) return;

    const press = drag.press(
      {
        id: event.pointerId,
        at: pointAt(event),
        primary: event.isPrimary,
        button: event.button,
        pointerType: event.pointerType,
        onContent: onContent(element, event),
      },
      () => cornerOf(layer),
    );
    match(press)
      .with({ kind: 'ignored' }, { kind: 'watched' }, () => undefined)
      .with({ kind: 'drawn' }, () => {
        element.setPointerCapture(event.pointerId);
        event.preventDefault();
      })
      .exhaustive();
  }

  export function pointermove(event: PointerEvent): void {
    drag.move(event.pointerId, pointAt(event));
  }

  export function pointerup(event: PointerEvent): void {
    drag.lift(event.pointerId, pointAt(event), event.pointerType);
  }

  export function pointercancel(event: PointerEvent): void {
    drag.cancel(event.pointerId);
  }

  export function beginAt(id: number, from: MarqueePoint, to: MarqueePoint): void {
    const layer = host;
    drag.unwatch();
    if (within === null || layer === null) return;

    drag.beginAt(id, from, to, () => cornerOf(layer));
  }

  export function extendTo(at: MarqueePoint): void {
    drag.extendTo(at);
  }

  export function endAt(at: MarqueePoint): void {
    drag.endAt(at);
  }

  export function abandon(): void {
    drag.abandon();
  }
</script>

<div class="marquee-selection" bind:this={host} aria-hidden="true">
  {#if box !== null}
    <div
      class={[
        'marquee-selection-box place-rect region-box z-raised',
        { 'region-box-accent': accent },
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
      {#if label !== undefined}
        <p class="marquee-selection-label mono text-xs surface-raised rounded-control px-2 py-1">
          {label}
        </p>
      {/if}
    </div>
  {/if}
</div>
