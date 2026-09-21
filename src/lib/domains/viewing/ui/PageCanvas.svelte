<script lang="ts">
  import { untrack } from 'svelte';
  import { match } from 'ts-pattern';
  import { releasePicture } from '$lib/platform/image/bitmap';
  import type { ImageRect, Size } from '$lib/shared/geometry';
  import type { ImageIndex } from '$lib/shared/ids';
  import type { PagePicture } from '$lib/shared/page-source';
  import { toPageFraction } from '../domain/placement';

  type Phase = 'loading' | 'shown' | 'failed';

  type Props = {
    readonly index: ImageIndex;
    readonly label: string;
    readonly load: (index: ImageIndex) => Promise<PagePicture | null>;
    readonly measured?: (index: ImageIndex, size: Size) => void;
    readonly flush?: boolean;
    readonly glow?: readonly ImageRect[];
    readonly marker?: string | null;
  };

  let { index, label, load, measured, flush = false, glow = [], marker = null }: Props = $props();

  let frame = $state<HTMLCanvasElement | null>(null);
  let picture = $state.raw<PagePicture | null>(null);
  let phase = $state<Phase>('loading');
  let ratio = $state(2 / 3);
  let natural = $state.raw<Size | null>(null);

  const boxes = $derived.by(() => {
    const size = natural;
    if (size === null || phase !== 'shown') return [];

    return glow.map((rect) => toPageFraction(size, rect)).filter((box) => box !== null);
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
      const got = await untrack(() => load(wanted));
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
  class="page"
  class:blank={phase !== 'shown'}
  class:flush
  style:aspect-ratio={ratio}
  role="img"
  aria-label={caption}
>
  {#if picture !== null && picture.kind === 'encoded'}
    <img
      src={picture.url}
      alt=""
      decoding="async"
      data-image-index={index}
      onload={shown}
      onerror={() => (phase = 'failed')}
    />
  {:else}
    <canvas bind:this={frame} width={0} height={0} data-image-index={index}></canvas>
  {/if}
  {#each boxes as box, order (order)}
    <span
      class="glow"
      style:left="{box.left}%"
      style:top="{box.top}%"
      style:width="{box.width}%"
      style:height="{box.height}%"
    >
      {#if marker !== null && order === 0}
        <span class="marker">{marker}</span>
      {/if}
    </span>
  {/each}
  {#if notice !== null}
    <p class="notice" aria-hidden="true">{notice}</p>
  {/if}
</div>

<style>
  .page {
    position: relative;
    height: 100%;
    background: var(--c-paper);
    box-shadow: 0 0 var(--s-6) var(--c-surface-void);
  }

  .page.flush {
    box-shadow: none;
  }

  .page.blank {
    background: var(--c-surface-card-quiet);
  }

  canvas,
  img {
    display: block;
    width: 100%;
    height: 100%;
  }

  .glow {
    position: absolute;
    z-index: var(--z-marquee);
    border: 2px solid var(--c-accent);
    background: var(--c-accent-wash-strong);
    box-shadow:
      0 0 0 4px rgb(79 178 134 / 18%),
      0 0 34px rgb(79 178 134 / 25%);
    pointer-events: none;
  }

  .marker {
    position: absolute;
    bottom: calc(100% + 5px);
    left: 0;
    padding: 3px var(--s-2);
    border-radius: var(--r-2);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-family: var(--f-mono);
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  .notice {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: var(--s-3);
    color: var(--c-text-8);
    font-family: var(--f-ui);
    font-size: 11.5px;
    text-align: center;
  }
</style>
