<script lang="ts">
  import { untrack } from 'svelte';
  import { match } from 'ts-pattern';
  import type { ImageRect, Size } from '$lib/shared/geometry';
  import type { ImageIndex } from '$lib/shared/ids';
  import type { ImageRegion } from '$lib/shared/image-region';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import type { PageFit } from '$lib/shared/page-fit';
  import type { PageGroup } from '../domain/page-pairing';
  import { canPan, centrePan, clampPan, fitZoom, panBy, zoomAt } from '../domain/viewport';
  import type { Viewport } from '../domain/viewport';
  import { hintsToShow, pagedHints } from './gesture-hint';
  import type { GestureHint } from './gesture-hint';
  import { handlesOwnKeys, handlesOwnSpace } from './keyboard';
  import { learnedGestures, learnGesture } from './learned-gestures.svelte';
  import PageCanvas from './PageCanvas.svelte';
  import SelectionLayer from './SelectionLayer.svelte';

  type Fit = PageFit | 'free';

  type Frames = { readonly content: Size; readonly frame: Size };

  type Grab = {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly bySpace: boolean;
  };

  type Props = {
    readonly pages: PageGroup;
    readonly direction: ReadingDirection;
    readonly pageFit: PageFit;
    readonly imageAt: (index: ImageIndex) => Promise<ImageBitmap | null>;
    readonly glow?: readonly ImageRegion[];
    readonly chromeShown: boolean;
    readonly select: (regions: readonly ImageRegion[]) => void;
    readonly clear: () => void;
    readonly onTap: () => void;
    readonly onFit: (fit: PageFit) => void;
  };

  let {
    pages,
    direction,
    pageFit,
    imageAt,
    glow = [],
    chromeShown,
    select,
    clear,
    onTap,
    onFit,
  }: Props = $props();

  const ZOOM_STEP = 1.2;
  const WHEEL_ZOOM_SPAN = 320;
  const WHEEL_LINE_PX = 16;
  const FIT_HEIGHT_ZOOM = 1;

  let frame = $state<HTMLDivElement | null>(null);
  let strip = $state<HTMLDivElement | null>(null);
  let selection = $state<ReturnType<typeof SelectionLayer> | null>(null);
  let viewport = $state.raw<Viewport>({ zoom: FIT_HEIGHT_ZOOM, panX: 0, panY: 0 });
  let fit = $state.raw<Fit>(untrack(() => pageFit));
  let grab = $state.raw<Grab | null>(null);
  let spaceHeld = $state(false);
  let pannable = $state(false);
  let revealed = $state(false);
  let hintLines = $state.raw<readonly GestureHint[]>([]);

  let shownPages: PageGroup | null = null;

  const transform = $derived(
    `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
  );

  const pending = $derived(
    hintsToShow(chromeShown, pagedHints(pannable), learnedGestures(), revealed),
  );

  function label(index: ImageIndex): string {
    return String(index + 1).padStart(3, '0');
  }

  const GLOW_MARKER = 'FROM CAPTURE';

  function glowOn(index: ImageIndex): readonly ImageRect[] {
    return glow.filter((region) => region.index === index).map((region) => region.rect);
  }

  function selected(regions: readonly ImageRegion[]): void {
    learnGesture('select');
    select(regions);
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

  function commit(next: Viewport, sizes: Frames | null): void {
    viewport = next;
    if (sizes !== null) pannable = canPan(sizes.content, sizes.frame, next.zoom);
  }

  function settle(next: Viewport): void {
    const sizes = framesNow();
    commit(sizes === null ? next : clampPan(next, sizes.content, sizes.frame), sizes);
  }

  function recentre(zoom: number): void {
    const sizes = framesNow();
    const next: Viewport = { zoom, panX: viewport.panX, panY: viewport.panY };
    commit(sizes === null ? next : centrePan(next, sizes.content, sizes.frame), sizes);
  }

  function applyHeight(): void {
    fit = 'height';
    recentre(FIT_HEIGHT_ZOOM);
  }

  function applyWidth(): void {
    const sizes = framesNow();
    fit = 'width';
    if (sizes === null) return;
    recentre(fitZoom(sizes.content, sizes.frame, 'width'));
  }

  export function fitHeight(): void {
    applyHeight();
    onFit('height');
  }

  export function fitWidth(): void {
    applyWidth();
    onFit('width');
  }

  export function activeFit(): Fit {
    return fit;
  }

  function reapplyFit(): void {
    match(fit)
      .with('height', () => applyHeight())
      .with('width', () => applyWidth())
      .with('free', () => settle(viewport))
      .exhaustive();
  }

  function zoomed(next: Viewport): void {
    fit = 'free';
    settle(next);
    if (pannable) learnGesture('zoom-to-pan');
  }

  function stepZoom(factor: number): void {
    const sizes = framesNow();
    if (sizes === null) return;

    zoomed(zoomAt(viewport, factor, sizes.frame.width / 2, sizes.frame.height / 2));
  }

  function scrolled(delta: number, mode: number, extent: number): number {
    if (mode === WheelEvent.DOM_DELTA_LINE) return delta * WHEEL_LINE_PX;
    if (mode === WheelEvent.DOM_DELTA_PAGE) return delta * extent;
    return delta;
  }

  function release(id: number): void {
    const element = frame;
    if (element !== null && element.hasPointerCapture(id)) element.releasePointerCapture(id);
  }

  function stopGrab(): void {
    const moving = grab;
    if (moving === null) return;
    release(moving.id);
    grab = null;
  }

  function startGrab(element: HTMLElement, event: PointerEvent, bySpace: boolean): void {
    grab = { id: event.pointerId, x: event.clientX, y: event.clientY, bySpace };
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function dropSpace(): void {
    spaceHeld = false;
    if (grab !== null && grab.bySpace) stopGrab();
  }

  function onwheel(event: WheelEvent): void {
    const element = frame;
    if (element === null) return;

    event.preventDefault();
    const box = element.getBoundingClientRect();
    const dx = scrolled(event.deltaX, event.deltaMode, box.width);
    const dy = scrolled(event.deltaY, event.deltaMode, box.height);

    if (event.ctrlKey || event.metaKey) {
      zoomed(
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
      startGrab(element, event, false);
      return;
    }

    if (!event.isPrimary || event.button !== 0) return;

    if (spaceHeld) {
      startGrab(element, event, true);
      return;
    }

    selection?.pointerdown(event);
  }

  function onpointermove(event: PointerEvent): void {
    const moving = grab;
    if (moving !== null && moving.id === event.pointerId) {
      learnGesture(moving.bySpace ? 'space-pan' : 'middle-pan');
      grab = { id: moving.id, x: event.clientX, y: event.clientY, bySpace: moving.bySpace };
      settle(panBy(viewport, event.clientX - moving.x, event.clientY - moving.y));
      return;
    }

    selection?.pointermove(event);
  }

  function onpointerup(event: PointerEvent): void {
    if (grab !== null && grab.id === event.pointerId) {
      stopGrab();
      return;
    }

    selection?.pointerup(event);
  }

  function onpointercancel(event: PointerEvent): void {
    if (grab !== null && grab.id === event.pointerId) {
      stopGrab();
      return;
    }

    selection?.pointercancel(event);
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;

    if (event.key === 'Escape') {
      selection?.dismiss();
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (handlesOwnKeys(event.target)) return;

    if (event.key === '?') {
      event.preventDefault();
      revealed = !revealed;
      return;
    }

    if (event.key === ' ') {
      if (handlesOwnSpace(event.target)) return;
      event.preventDefault();
      spaceHeld = true;
      return;
    }

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

  function onkeyup(event: KeyboardEvent): void {
    if (event.key !== ' ') return;
    dropSpace();
  }

  function onblur(): void {
    dropSpace();
  }

  $effect(() => {
    const lines = pending;
    if (lines.length > 0) hintLines = lines;
  });

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
      selection?.reset();
      stopGrab();
      recentre(viewport.zoom);
    });
  });
</script>

<svelte:window {onkeydown} {onkeyup} {onblur} />

<div class="viewer">
  <div
    class="frame"
    class:grabbable={spaceHeld && grab === null && !(selection?.dragging() ?? false)}
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
        <PageCanvas
          {index}
          label={label(index)}
          load={imageAt}
          glow={glowOn(index)}
          marker={GLOW_MARKER}
        />
      {/each}
    </div>

    <SelectionLayer
      bind:this={selection}
      within={frame}
      arrangement="row"
      pointerTypes="any"
      suppressed={spaceHeld}
      select={selected}
      {clear}
      tap={onTap}
    />

    <p class="hint" class:hushed={pending.length === 0} aria-hidden="true">
      {#each hintLines as hint (hint.keys.join('+'))}
        <span class="gesture">
          {#each hint.keys as key, step (key)}
            {#if step > 0}<span class="join">+</span>{/if}
            <span class="cap">{key}</span>
          {/each}
          <span class="does">{hint.does}</span>
        </span>
      {/each}
    </p>
  </div>
</div>

<style>
  .viewer {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
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

  .frame.grabbable {
    cursor: grab;
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

  .hint {
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: var(--z-chrome);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-1) var(--s-3);
    margin: 0;
    padding: var(--s-2) var(--s-3);
    opacity: 1;
    transition: opacity 240ms ease;
    color: var(--c-text-10);
    font-size: 10.5px;
    pointer-events: none;
  }

  .hint.hushed {
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .hint {
      transition: none;
    }
  }

  .gesture {
    display: flex;
    align-items: center;
    gap: var(--s-1);
  }

  .cap {
    padding: 0 var(--s-1);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-1);
    background: var(--c-surface-chip);
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 9.5px;
    line-height: 15px;
  }

  .join {
    color: var(--c-text-11);
  }

  .does {
    white-space: nowrap;
  }
</style>
