<script lang="ts">
  import { onMount } from 'svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import {
    REFERENCE_CH,
    chFont,
    formatPixels,
    lengthIn,
    stackAtStage,
  } from '../../../domain/ch-unit';
  import type { FontStage } from '../../../domain/ch-unit';
  import DocsDemo from '../../DocsDemo.svelte';
  import './ch-unit.css';
  import { loadChFonts } from './load-fonts';
  import MeasuredBox from './MeasuredBox.svelte';

  const STAGES = [
    { value: 'fallback', label: 'Before the font arrives' },
    { value: 'web-font', label: 'After the font arrives' },
  ] as const;

  const FONT = chFont('dm-sans');

  const COLUMN = lengthIn('ch', REFERENCE_CH);

  let stage = $state<FontStage>('fallback');
  let before = $state<DOMRectReadOnly | undefined>();
  let after = $state<DOMRectReadOnly | undefined>();
  let status = $state('checking');

  const beforeWidth = $derived(before?.width ?? 0);
  const afterWidth = $derived(after?.width ?? 0);
  const shown = $derived(stage === 'fallback' ? beforeWidth : afterWidth);

  onMount(() => {
    void loadChFonts().then(() => {
      status = document.fonts.check('16px "DM Sans"', '0') ? 'loaded' : 'not loaded';
    });
  });
</script>

<DocsDemo label="One column, two zeros">
  {#snippet caption()}
    The control swaps the family list the column uses, between the fallback alone and the list with
    DM Sans first. This browser has DM Sans: <code>document.fonts.check</code> says
    {status}.
  {/snippet}
  <div class="ch-demo stack-md">
    <SegmentedControl label="Font state" options={STAGES} bind:value={stage} />
    <div class="overflow-auto">
      <div
        class="column-box bordered rounded-control surface-sunken font-text"
        style:--box-length={COLUMN}
        style:--demo-font={stackAtStage(FONT, stage)}
      >
        The column is 68ch wide. It measures {formatPixels(shown)} here.
      </div>
    </div>
    <p class="m-0 text-sm">
      Fallback: <strong>{formatPixels(beforeWidth)}</strong>. DM Sans:
      <strong>{formatPixels(afterWidth)}</strong>. The column grows by
      <strong>{formatPixels(afterWidth - beforeWidth)}</strong> when the font arrives.
    </p>
    <MeasuredBox stack={stackAtStage(FONT, 'fallback')} inlineSize={COLUMN} bind:rect={before} />
    <MeasuredBox stack={stackAtStage(FONT, 'web-font')} inlineSize={COLUMN} bind:rect={after} />
  </div>
</DocsDemo>
