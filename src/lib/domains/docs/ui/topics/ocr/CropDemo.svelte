<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { match } from 'ts-pattern';
  import Button from '$lib/ui/components/Button.svelte';
  import MarqueeSelection from '$lib/ui/components/MarqueeSelection.svelte';
  import type { MarqueeEnd } from '$lib/ui/components/marquee-selection';
  import { MAX_MODEL_INPUT_EDGE } from '$lib/domains/recognition/domain/engine/model-input';
  import { regionsIn, toPageFraction } from '$lib/domains/viewing/domain/placement';
  import { MIN_SELECTION_PX } from '$lib/domains/viewing/domain/selection';
  import { clickSlop } from '$lib/shared/click-slop';
  import { screenRect } from '$lib/shared/geometry';
  import { imageIndex } from '$lib/shared/ids';
  import type { ImageRegion } from '$lib/shared/image-region';
  import type { PageSource } from '$lib/shared/page-source';
  import { factorText, sizeText } from '../../../domain/ocr-crop';
  import { SAMPLE_PAGE_SIZE, SAMPLE_REGIONS, regionText } from '../../../domain/ocr-sample';
  import DocsDemo from '../../DocsDemo.svelte';
  import { CropPipeline } from './crop-pipeline.svelte';
  import { closeStages, cropStages } from './crop-stages';
  import './ocr-demos.css';

  type Props = {
    source: PageSource;
    src: string;
    regions: readonly ImageRegion[];
    onregions: (regions: readonly ImageRegion[]) => void;
  };

  let { source, src, regions, onregions }: Props = $props();

  let surface = $state<HTMLDivElement | null>(null);
  let picture = $state<HTMLImageElement | null>(null);
  let marquee = $state<ReturnType<typeof MarqueeSelection> | null>(null);

  const pipeline = new CropPipeline({
    render: (chosen) => cropStages(source, chosen, 'row'),
    release: closeStages,
  });

  const boxes = $derived(
    regions.flatMap((region) => {
      const fraction = toPageFraction(region.rect);
      return fraction === null ? [] : [fraction];
    }),
  );

  function choose(next: readonly ImageRegion[]): void {
    onregions(next);
    void pipeline.show(next);
  }

  function selected(end: MarqueeEnd): void {
    marquee?.reset();
    const image = picture;
    if (image === null) return;

    match(end)
      .with({ kind: 'click' }, { kind: 'too-small' }, () => undefined)
      .with({ kind: 'selection' }, ({ selection }) => {
        const placed = image.getBoundingClientRect();
        const found = regionsIn(
          [
            {
              index: imageIndex(0),
              onScreen: screenRect(placed.x, placed.y, placed.width, placed.height),
              natural: SAMPLE_PAGE_SIZE,
            },
          ],
          screenRect(selection.x, selection.y, selection.width, selection.height),
        );
        if (found.length > 0) choose(found);
      })
      .exhaustive();
  }

  function paint(bitmap: ImageBitmap): Attachment<HTMLCanvasElement> {
    return (canvas) => {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    };
  }

  onMount(() => {
    void pipeline.show(regions);
  });

  onDestroy(() => pipeline.dispose());
</script>

<DocsDemo label="Selection to crop">
  {#snippet controls()}
    {#each SAMPLE_REGIONS as sample (sample.preset)}
      <Button size="sm" variant="ghost" onclick={() => choose([sample.region])}
        >{sample.label}</Button
      >
    {/each}
  {/snippet}
  <div class="ocr-crop-demo grid-2 gap-4">
    <div
      bind:this={surface}
      class="page relative bordered"
      role="application"
      aria-label="Sample page. Drag a rectangle to select a region."
      onpointerdown={(event) => marquee?.pointerdown(event)}
      onpointermove={(event) => marquee?.pointermove(event)}
      onpointerup={(event) => marquee?.pointerup(event)}
      onpointercancel={(event) => marquee?.pointercancel(event)}
    >
      <img
        bind:this={picture}
        {src}
        alt="A two-panel sample manga page with two speech bubbles and a caption box"
        width={SAMPLE_PAGE_SIZE.width}
        height={SAMPLE_PAGE_SIZE.height}
        draggable="false"
      />
      {#each boxes as box, index (index)}
        <div
          class="place-rect region-box"
          style:--rect-left="{box.left}%"
          style:--rect-top="{box.top}%"
          style:--rect-width="{box.width}%"
          style:--rect-height="{box.height}%"
        ></div>
      {/each}
      <MarqueeSelection
        bind:this={marquee}
        within={surface}
        pointerTypes="any"
        slop={clickSlop}
        minimum={MIN_SELECTION_PX}
        onend={selected}
      />
    </div>
    <div class="stack-md min-w-0">
      {#each regions as region, index (index)}
        <p class="m-0 text-sm"><code>{regionText(region)}</code></p>
      {/each}
      {#if pipeline.view.kind === 'shown'}
        {@const numbers = pipeline.view.numbers}
        <dl class="grid-2 gap-2 m-0 text-sm">
          <dt class="text-muted">Crop</dt>
          <dd class="m-0">{sizeText(numbers.crop)}, at the page's own resolution</dd>
          <dt class="text-muted">Cap</dt>
          <dd class="m-0">
            {factorText(numbers.capFactor)}, so the long edge is at most {MAX_MODEL_INPUT_EDGE} pixels
          </dd>
          <dt class="text-muted">Prepared input</dt>
          <dd class="m-0">{sizeText(numbers.prepared)}, gray, with Pillow's luma weights</dd>
          <dt class="text-muted">Model input</dt>
          <dd class="m-0">
            {sizeText(numbers.modelInput)}, squashed {factorText(numbers.squash.across)} across and
            {factorText(numbers.squash.down)} down
          </dd>
        </dl>
      {:else if pipeline.view.kind === 'failed'}
        <p class="text-sm text-danger">{pipeline.view.message}</p>
      {:else}
        <p class="text-sm text-muted">Cropping…</p>
      {/if}
    </div>
  </div>
  {#if pipeline.view.kind === 'shown'}
    {@const stages = pipeline.view.stages}
    <div class="ocr-crop-demo grid-3">
      <figure class="stack-sm m-0">
        <canvas class="stage bordered" {@attach paint(stages.crop)}></canvas>
        <figcaption class="text-sm text-muted">Crop</figcaption>
      </figure>
      <figure class="stack-sm m-0">
        <canvas class="stage bordered" {@attach paint(stages.prepared)}></canvas>
        <figcaption class="text-sm text-muted">Prepared input</figcaption>
      </figure>
      <figure class="stack-sm m-0">
        <canvas class="stage model-input bordered" {@attach paint(stages.modelInput)}></canvas>
        <figcaption class="text-sm text-muted">Model input</figcaption>
      </figure>
    </div>
  {/if}
  {#snippet caption()}
    Drag over the page, or pick a preset. The boxes and numbers come from the code Dokseo runs on a
    real capture.
  {/snippet}
</DocsDemo>
