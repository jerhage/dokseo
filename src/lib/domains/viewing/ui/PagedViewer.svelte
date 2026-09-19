<script lang="ts">
  import type { ImageIndex } from '$lib/shared/ids';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import type { PageGroup } from '../domain/page-pairing';
  import PageCanvas from './PageCanvas.svelte';

  type Props = {
    readonly pages: PageGroup;
    readonly direction: ReadingDirection;
    readonly imageAt: (index: ImageIndex) => Promise<ImageBitmap | null>;
  };

  let { pages, direction, imageAt }: Props = $props();

  function label(index: ImageIndex): string {
    return String(index + 1).padStart(3, '0');
  }
</script>

<div class="viewer">
  <div class="strip" class:rtl={direction === 'rtl'}>
    {#each pages as index (index)}
      <PageCanvas {index} label={label(index)} load={imageAt} />
    {/each}
  </div>
</div>

<style>
  .viewer {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-height: 0;
    overflow: hidden;
    padding: var(--s-5);
    background: var(--c-viewer-gradient);
  }

  .strip {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    height: 100%;
  }

  .strip.rtl {
    flex-direction: row-reverse;
  }
</style>
