<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import Badge from '$lib/ui/components/Badge.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import type { SegmentOption } from '$lib/ui/components/segmented-control';
  import Toggle from '$lib/ui/components/Toggle.svelte';
  import { screenRect } from '$lib/shared/geometry';
  import DocsDemo from '../../DocsDemo.svelte';
  import { sizeFigure } from '../../../domain/bitmap-memory';
  import {
    CAPTURE_PRESETS,
    captureAt,
    devicePixelsPerPagePixel,
    readAgainstScale,
    rectFigure,
    renderedSize,
    selectionOver,
  } from './render-scale';
  import type { CapturePreset } from './render-scale';
  import { paintSamplePage } from './sample-drawing';
  import './scale-demo.css';

  const PRESETS: readonly SegmentOption<CapturePreset>[] = [
    { value: 'title', label: 'Title' },
    { value: 'bubble', label: 'Speech bubble' },
    { value: 'caption', label: 'Caption box' },
  ];

  const SCALES = [1, 2] as const;

  let preset = $state<CapturePreset>('bubble');
  let misread = $state(false);
  let shownWidth = $state(0);
  let shownHeight = $state(0);
  let ratio = $state(window.devicePixelRatio);

  const display = $derived(screenRect(0, 0, shownWidth, shownHeight));
  const selection = $derived(selectionOver(display, CAPTURE_PRESETS[preset]));
  const captures = $derived(SCALES.map((scale) => captureAt(display, selection, scale)));
  const takenAtTwo = $derived(captures[1] ?? null);
  const misplaced = $derived(takenAtTwo === null ? null : readAgainstScale(takenAtTwo.rect, 1));

  function painted(scale: number): Attachment<HTMLCanvasElement> {
    return (canvas) => {
      paintSamplePage(canvas, scale);
    };
  }

  function readRatio(): void {
    ratio = window.devicePixelRatio;
  }
</script>

<svelte:window onresize={readRatio} />

<DocsDemo label="One selection at two render scales">
  {#snippet controls()}
    <SegmentedControl label="Selection" variant="track" options={PRESETS} bind:value={preset} />
  {/snippet}
  <p class="row wrap items-center gap-2 m-0 text-sm">
    <code>devicePixelRatio</code>
    <Badge>{ratio}</Badge>
    <span>Each page below is shown</span>
    <Badge>{Math.round(shownWidth)} CSS px</Badge>
    <span>wide.</span>
  </p>
  <div class="rendering-scale-demo grid-2 gap-4">
    {#each SCALES as scale, at (scale)}
      {@const capture = captures[at] ?? null}
      {@const natural = renderedSize(scale)}
      <figure class="page stack-sm m-0">
        <div class="relative bordered">
          {#if at === 0}
            <canvas
              {@attach painted(scale)}
              bind:clientWidth={shownWidth}
              bind:clientHeight={shownHeight}
              aria-label="The sample page drawn at scale {scale}"
            ></canvas>
          {:else}
            <canvas {@attach painted(scale)} aria-label="The sample page drawn at scale {scale}"
            ></canvas>
          {/if}
          {#if capture !== null}
            <span
              class="place-rect region-box"
              style:--rect-left="{capture.box.left}%"
              style:--rect-top="{capture.box.top}%"
              style:--rect-width="{capture.box.width}%"
              style:--rect-height="{capture.box.height}%"
            ></span>
          {/if}
          {#if scale === 1 && misread && misplaced !== null}
            <span
              class="place-rect region-box region-box-accent"
              style:--rect-left="{misplaced.left}%"
              style:--rect-top="{misplaced.top}%"
              style:--rect-width="{misplaced.width}%"
              style:--rect-height="{misplaced.height}%"
            ></span>
          {/if}
        </div>
        <figcaption class="stack-sm text-sm">
          <span class="row wrap items-center gap-2">
            <strong>Scale {scale}</strong>
            <Badge>{sizeFigure(natural)} px</Badge>
            <span class="text-muted">
              {devicePixelsPerPagePixel(shownWidth, ratio, natural.width).toFixed(2)} device px per page
              px
            </span>
          </span>
          {#if capture !== null}
            <code>{rectFigure(capture.rect)}</code>
          {/if}
        </figcaption>
      </figure>
    {/each}
  </div>
  <Toggle bind:checked={misread}>Read the scale 2 rectangle against the scale 1 render</Toggle>
  {#if misread}
    <p class="m-0 text-sm">
      {#if misplaced === null}
        The stored rectangle starts past the edge of the scale 1 page, so it covers none of it.
      {:else}
        The accent box is where the stored numbers land on the scale 1 page: twice as far from the
        corner and twice as large.
      {/if}
    </p>
  {/if}
  {#snippet caption()}
    The page is a list of drawing instructions in points, painted at each scale the way pdf.js
    paints a PDF page. The rectangles come from <code>toImageRect</code>, the function the reading
    screen uses to turn a selection on screen into pixels of the page.
  {/snippet}
</DocsDemo>
