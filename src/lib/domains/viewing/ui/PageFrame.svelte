<script lang="ts">
  import { untrack } from 'svelte';
  import { match } from 'ts-pattern';
  import Badge from '$lib/components/Badge.svelte';
  import { releasePicture } from '$lib/platform/image/bitmap';
  import type { Size } from '$lib/shared/geometry';
  import type { ImageIndex } from '$lib/shared/ids';
  import type { GlowRegion } from '$lib/shared/image-region';
  import type { PagePicture } from '$lib/shared/page-source';
  import { toPageFraction } from '../domain/placement';
  import { glowMarker } from './page-glow';
  import './page-frame.css';

  type Phase = 'loading' | 'shown' | 'failed';

  type Props = {
    readonly index: ImageIndex;
    readonly label: string;
    readonly pictureAt: (index: ImageIndex) => Promise<PagePicture | null>;
    readonly measured?: (index: ImageIndex, size: Size) => void;
    readonly flush?: boolean;
    readonly glow?: readonly GlowRegion[];
  };

  let { index, label, pictureAt, measured, flush = false, glow = [] }: Props = $props();

  const marker = $derived(glowMarker(glow));

  let frame = $state<HTMLCanvasElement | null>(null);
  let picture = $state.raw<PagePicture | null>(null);
  let phase = $state<Phase>('loading');
  let ratio = $state(2 / 3);
  let natural = $state.raw<Size | null>(null);

  const boxes = $derived.by(() => {
    const size = natural;
    if (size === null || phase !== 'shown') return [];

    return glow.flatMap((region) => {
      const box = toPageFraction(size, region.rect);
      return box === null ? [] : [{ box, origin: region.origin }];
    });
  });

  const caption = $derived(
    match(phase)
      .with('loading', () => `Page ${label}, loading`)
      .with('shown', () => `Page ${label}`)
      .with('failed', () => `Page ${label}, could not be opened`)
      .exhaustive(),
  );

  const notice = $derived(
    match(phase)
      .with('loading', () => 'Loading…')
      .with('shown', () => null)
      .with('failed', () => 'This page will not open.')
      .exhaustive(),
  );

  const asked = $derived(index);

  function show(size: Size): void {
    natural = size;
    ratio = size.height > 0 ? size.width / size.height : 2 / 3;
    phase = 'shown';
    untrack(() => measured?.(asked, size));
  }

  function shown(event: Event): void {
    const image = event.currentTarget;
    if (!(image instanceof HTMLImageElement)) return;
    show({ width: image.naturalWidth, height: image.naturalHeight });
  }

  $effect(() => {
    const wanted = asked;

    let live = true;
    let held: PagePicture | null = null;
    phase = 'loading';

    void (async () => {
      const got = await untrack(() => pictureAt(wanted));
      if (!live) {
        if (got !== null) releasePicture(got);
        return;
      }
      if (got === null) {
        phase = 'failed';
        return;
      }

      held = got;
      picture = got;
    })();

    return () => {
      live = false;
      picture = null;
      if (held !== null) releasePicture(held);
    };
  });

  $effect(() => {
    const canvas = frame;
    const drawn = picture;
    if (canvas === null || drawn === null || drawn.kind !== 'drawn') return;

    const context = canvas.getContext('bitmaprenderer');
    if (context === null) {
      phase = 'failed';
      return;
    }

    const size = { width: drawn.bitmap.width, height: drawn.bitmap.height };
    canvas.width = size.width;
    canvas.height = size.height;
    context.transferFromImageBitmap(drawn.bitmap);
    show(size);
  });
</script>

<div
  class={[
    'page-frame relative',
    phase === 'shown' ? 'scheme-light surface-bright' : 'surface-raised',
    { 'shadow-md': !flush },
  ]}
  style:--page-ratio={ratio}
  role="img"
  aria-label={caption}
>
  {#if picture !== null && picture.kind === 'encoded'}
    <img
      class="w-full h-full"
      src={picture.url}
      alt=""
      decoding="async"
      data-image-index={index}
      onload={shown}
      onerror={() => (phase = 'failed')}
    />
  {:else}
    <canvas class="w-full h-full" bind:this={frame} width={0} height={0} data-image-index={index}
    ></canvas>
  {/if}
  {#each boxes as drawn, order (order)}
    <span
      class={['glow', { 'is-note': drawn.origin === 'written' }]}
      style:--glow-left="{drawn.box.left}%"
      style:--glow-top="{drawn.box.top}%"
      style:--glow-width="{drawn.box.width}%"
      style:--glow-height="{drawn.box.height}%"
    >
      {#if marker !== null && order === 0}
        <Badge
          class="glow-marker mono"
          solid
          variant={drawn.origin === 'written' ? 'accent' : 'brand'}>{marker}</Badge
        >
      {/if}
    </span>
  {/each}
  {#if notice !== null}
    <p class="notice col items-center justify-center p-3 text-xs text-faint" aria-hidden="true">
      {notice}
    </p>
  {/if}
</div>
