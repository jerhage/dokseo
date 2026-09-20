<script lang="ts">
  import { match } from 'ts-pattern';
  import type { ImageRect, Size } from '$lib/shared/geometry';
  import type { ImageIndex } from '$lib/shared/ids';
  import { toPageFraction } from '../domain/placement';

  type Phase = 'loading' | 'shown' | 'failed';

  type Props = {
    readonly index: ImageIndex;
    readonly label: string;
    readonly load: (index: ImageIndex) => Promise<ImageBitmap | null>;
    readonly flush?: boolean;
    readonly glow?: readonly ImageRect[];
    readonly marker?: string | null;
  };

  let { index, label, load, flush = false, glow = [], marker = null }: Props = $props();

  let frame = $state<HTMLCanvasElement | null>(null);
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

  $effect(() => {
    const canvas = frame;
    const wanted = index;
    if (canvas === null) return;

    let live = true;
    phase = 'loading';

    void (async () => {
      const bitmap = await load(wanted);
      if (!live) {
        bitmap?.close();
        return;
      }
      if (bitmap === null) {
        phase = 'failed';
        return;
      }

      const context = canvas.getContext('bitmaprenderer');
      if (context === null) {
        bitmap.close();
        phase = 'failed';
        return;
      }

      const measured = { width: bitmap.width, height: bitmap.height };
      natural = measured;
      ratio = measured.height > 0 ? measured.width / measured.height : 2 / 3;
      canvas.width = measured.width;
      canvas.height = measured.height;
      context.transferFromImageBitmap(bitmap);
      phase = 'shown';
    })();

    return () => {
      live = false;
    };
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
  <canvas bind:this={frame} width={0} height={0} data-image-index={index}></canvas>
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

  canvas {
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
