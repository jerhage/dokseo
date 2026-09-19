<script lang="ts">
  import { match } from 'ts-pattern';
  import type { ImageIndex } from '$lib/shared/ids';

  type Phase = 'loading' | 'shown' | 'failed';

  type Props = {
    readonly index: ImageIndex;
    readonly label: string;
    readonly load: (index: ImageIndex) => Promise<ImageBitmap | null>;
  };

  let { index, label, load }: Props = $props();

  let frame = $state<HTMLCanvasElement | null>(null);
  let phase = $state<Phase>('loading');
  let ratio = $state(2 / 3);

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

      ratio = bitmap.height > 0 ? bitmap.width / bitmap.height : 2 / 3;
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
  style:aspect-ratio={ratio}
  role="img"
  aria-label={caption}
>
  <canvas bind:this={frame} width={0} height={0} data-image-index={index}></canvas>
  {#if notice !== null}
    <p class="notice" aria-hidden="true">{notice}</p>
  {/if}
</div>

<style>
  .page {
    position: relative;
    height: 100%;
    background: var(--c-paper);
    box-shadow: 0 var(--s-3) var(--s-6) var(--c-surface-void);
  }

  .page.blank {
    background: var(--c-surface-card-quiet);
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
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
