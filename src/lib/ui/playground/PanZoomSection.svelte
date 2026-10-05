<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { P, match } from 'ts-pattern';
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import type { GestureInput, GestureIntent, GestureSample } from '../components/gesture';
  import { GestureFeed } from '../components/gesture-feed';
  import {
    canPan,
    centrePan,
    clampPan,
    DOUBLE_TAP_ZOOM,
    doubleTapTarget,
    fitZoom,
    MAX_ZOOM,
    MIN_ZOOM,
    panBy,
    pinchStep,
    wheelPixels,
    wheelZoomFactor,
    zoomAt,
    ZOOM_STEP,
  } from '../components/pan-zoom';
  import type { FitMode, Pinch, Size, Viewport, ZoomPoint } from '../components/pan-zoom';
  import DemoSection from './DemoSection.svelte';
  import './pan-zoom-section.css';

  type Grab = { readonly id: number; readonly x: number; readonly y: number };

  const FITS: readonly FitMode[] = ['contain', 'width', 'height'];
  const CELLS = Array.from({ length: 9 }, (_, index) => index + 1);

  let frame = $state<HTMLDivElement | null>(null);
  let frameWidth = $state(0);
  let frameHeight = $state(0);
  let contentWidth = $state(0);
  let contentHeight = $state(0);
  let viewport = $state.raw<Viewport>({ zoom: 1, panX: 0, panY: 0 });
  let fit = $state<FitMode | 'free'>('contain');
  let grab = $state.raw<Grab | null>(null);
  let lastPointer = '';

  const gestures = new GestureFeed(feed);

  const frameSize = $derived<Size>({ width: frameWidth, height: frameHeight });
  const contentSize = $derived<Size>({ width: contentWidth, height: contentHeight });
  const pannable = $derived(canPan(contentSize, frameSize, viewport.zoom));
  const floor = $derived(fitZoom(contentSize, frameSize, 'contain'));

  function settle(next: Viewport): void {
    viewport = clampPan(next, contentSize, frameSize);
  }

  function zoomed(next: Viewport): void {
    fit = 'free';
    settle(next);
  }

  function fitTo(mode: FitMode): void {
    fit = mode;
    viewport = centrePan(
      { zoom: fitZoom(contentSize, frameSize, mode), panX: 0, panY: 0 },
      contentSize,
      frameSize,
    );
  }

  function framePoint(x: number, y: number): ZoomPoint | null {
    const element = frame;
    if (element === null) return null;

    const box = element.getBoundingClientRect();
    return { x: x - box.left, y: y - box.top };
  }

  function doubleTapped(x: number, y: number): void {
    const point = framePoint(x, y);
    if (point === null) return;

    const target = doubleTapTarget(viewport, floor, point);
    if (target.kind === 'zoom') {
      zoomed(target.viewport);
      return;
    }

    fit = 'contain';
    settle(target.viewport);
  }

  function pinched(pinch: Pinch): void {
    const centre = framePoint(pinch.cx, pinch.cy);
    if (centre === null) return;

    fit = 'free';
    viewport = pinchStep(
      viewport,
      { ...pinch, cx: centre.x, cy: centre.y },
      { content: contentSize, frame: frameSize, floor },
    );
  }

  function acted(intent: GestureIntent): void {
    match(intent)
      .with({ kind: 'pan' }, ({ dx, dy }) => settle(panBy(viewport, dx, dy)))
      .with({ kind: 'pinch' }, (pinch) => pinched(pinch))
      .with({ kind: 'double-tap' }, ({ x, y }) => doubleTapped(x, y))
      .with(
        {
          kind: P.union(
            'none',
            'tap',
            'long-press',
            'pan-end',
            'swipe',
            'select-begin',
            'select-move',
            'select-end',
            'cancel',
          ),
        },
        () => undefined,
      )
      .exhaustive();
  }

  function feed(input: GestureInput): void {
    const step = gestures.step(input, {
      pannable,
      selectMode: false,
      waitsForDoubleTap: () => true,
    });
    acted(step.intent);
  }

  function onwheel(event: WheelEvent): void {
    const element = frame;
    if (element === null) return;

    event.preventDefault();
    const box = element.getBoundingClientRect();
    const dx = wheelPixels(event.deltaX, event.deltaMode, box.width);
    const dy = wheelPixels(event.deltaY, event.deltaMode, box.height);

    if (event.ctrlKey || event.metaKey) {
      zoomed(zoomAt(viewport, wheelZoomFactor(dy), event.clientX - box.x, event.clientY - box.y));
      return;
    }

    settle(panBy(viewport, -dx, -dy));
  }

  function stepZoom(factor: number): void {
    zoomed(zoomAt(viewport, factor, frameWidth / 2, frameHeight / 2));
  }

  function feedTouch(kind: GestureSample['kind'], event: PointerEvent): void {
    if (kind === 'down') {
      frame?.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
    feed(gestures.sample(kind, event));
  }

  function onpointerdown(event: PointerEvent): void {
    lastPointer = event.pointerType;
    if (event.pointerType === 'touch') {
      feedTouch('down', event);
      return;
    }
    if (event.button !== 0 && event.button !== 1) return;

    grab = { id: event.pointerId, x: event.clientX, y: event.clientY };
    frame?.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onpointermove(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      feedTouch('move', event);
      return;
    }

    const moving = grab;
    if (moving === null || moving.id !== event.pointerId) return;

    grab = { id: moving.id, x: event.clientX, y: event.clientY };
    settle(panBy(viewport, event.clientX - moving.x, event.clientY - moving.y));
  }

  function ended(kind: 'up' | 'cancel', event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      feedTouch(kind, event);
      return;
    }
    if (grab !== null && grab.id === event.pointerId) grab = null;
  }

  function ondblclick(event: MouseEvent): void {
    if (lastPointer === 'touch') return;
    doubleTapped(event.clientX, event.clientY);
  }

  function resized(outer: HTMLElement, inner: HTMLElement): void {
    const unchanged =
      outer.clientWidth === frameWidth &&
      outer.clientHeight === frameHeight &&
      inner.offsetWidth === contentWidth &&
      inner.offsetHeight === contentHeight;
    if (unchanged) return;

    frameWidth = outer.clientWidth;
    frameHeight = outer.clientHeight;
    contentWidth = inner.offsetWidth;
    contentHeight = inner.offsetHeight;
    if (frameWidth <= 0 || frameHeight <= 0 || contentWidth <= 0 || contentHeight <= 0) return;

    if (fit === 'free') settle(viewport);
    else fitTo(fit);
  }

  const measureSizes: Attachment<HTMLDivElement> = (outer) => {
    const inner = outer.querySelector('.zoom-surface');
    if (!(inner instanceof HTMLElement)) return;

    const observer = new ResizeObserver(() => resized(outer, inner));
    observer.observe(outer, { box: 'border-box' });
    observer.observe(inner, { box: 'border-box' });
    untrack(() => resized(outer, inner));
    return () => observer.disconnect();
  };

  onDestroy(() => gestures.stop());
</script>

<DemoSection
  id="pan-zoom"
  title="Pan and zoom"
  classes={['zoom-surface', 'is-grabbable', 'is-grabbing']}
>
  <p class="text-sm text-muted">
    <code>pan-zoom.ts</code> holds the viewport maths: zoom about a point, a pan clamped to the
    frame, fits, a pinch that stops at the fit, and a double tap that zooms to {DOUBLE_TAP_ZOOM} × the
    fit and back, all within {MIN_ZOOM}–{MAX_ZOOM} ×. <code>.zoom-surface</code> draws the viewport
    from <code>--zoom-surface-pan-x</code>, <code>--zoom-surface-pan-y</code>
    and <code>--zoom-surface-zoom</code>. Drag to pan, Ctrl or ⌘ and the wheel to zoom, double click
    or double tap, pinch.
  </p>
  <div class="row wrap gap-2">
    {#each FITS as mode (mode)}
      <Button size="sm" variant={fit === mode ? 'primary' : 'default'} onclick={() => fitTo(mode)}>
        Fit {mode}
      </Button>
    {/each}
    <Button size="sm" onclick={() => stepZoom(ZOOM_STEP)}>Zoom in</Button>
    <Button size="sm" onclick={() => stepZoom(1 / ZOOM_STEP)}>Zoom out</Button>
    <code class="text-xs"
      >zoom {viewport.zoom.toFixed(2)} · {fit}{pannable ? ' · pannable' : ''}</code
    >
  </div>
  <Card>
    <div
      bind:this={frame}
      {@attach measureSizes}
      class={[
        'pan-zoom-section relative overflow-hidden aspect-video surface-sunken rounded-container',
        { 'is-grabbable': grab === null, 'is-grabbing': grab !== null },
      ]}
      role="application"
      aria-label="Pan and zoom frame"
      {onwheel}
      {onpointerdown}
      {onpointermove}
      onpointerup={(event) => ended('up', event)}
      onpointercancel={(event) => ended('cancel', event)}
      {ondblclick}
    >
      <div
        class="zoom-surface h-full aspect-portrait grid-3-col gap-1 p-2 surface-raised bordered"
        style:--zoom-surface-pan-x="{viewport.panX}px"
        style:--zoom-surface-pan-y="{viewport.panY}px"
        style:--zoom-surface-zoom={viewport.zoom}
      >
        {#each CELLS as cell (cell)}
          <span class="col items-center justify-center surface-sunken rounded-control mono"
            >{cell}</span
          >
        {/each}
      </div>
    </div>
  </Card>
</DemoSection>
