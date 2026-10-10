<script lang="ts">
  import { onMount } from 'svelte';
  import Slider from '$lib/ui/components/Slider.svelte';
  import {
    CH_FONTS,
    REFERENCE_CH,
    formatPixels,
    lengthIn,
    zeroAdvanceOf,
  } from '../../../domain/ch-unit';
  import DocsDemo from '../../DocsDemo.svelte';
  import './ch-unit.css';
  import { loadChFonts } from './load-fonts';
  import MeasuredBox from './MeasuredBox.svelte';

  let ch = $state(REFERENCE_CH);
  let rects = $state<Record<string, DOMRectReadOnly | undefined>>({});

  const widest = $derived(Math.max(1, ...CH_FONTS.map((font) => rects[font.slug]?.width ?? 0)));

  onMount(() => {
    void loadChFonts();
  });
</script>

<DocsDemo label="One ch value, eight fonts">
  {#snippet caption()}
    Each row measures a hidden element whose <code>inline-size</code> is the chosen ch value, set in that
    font at 16px. The fonts are the ones Dokseo's themes already load. The zero column is the measured
    width divided by the ch value.
  {/snippet}
  <div class="ch-demo stack-md">
    <Slider
      label="inline-size in ch"
      value={ch}
      min={20}
      max={100}
      valuetext="{ch} ch"
      oninput={(event) => (ch = Number(event.currentTarget.value))}
    />
    <ul class="stack-sm list-reset">
      {#each CH_FONTS as font (font.slug)}
        {@const width = rects[font.slug]?.width ?? 0}
        <li class="stack-sm">
          <div class="row wrap items-center justify-between gap-2">
            <span class="font-text" style:--demo-font={font.stack}>
              {font.label} <span class="text-muted text-sm">({font.theme})</span>
            </span>
            <span class="mono text-sm">
              {formatPixels(width)} · 0 is {formatPixels(zeroAdvanceOf(width, ch))}
            </span>
          </div>
          <div class="bar-track" style:--bar-share={width / widest}>
            <div class="bar"></div>
          </div>
          <MeasuredBox
            stack={font.stack}
            inlineSize={lengthIn('ch', ch)}
            bind:rect={rects[font.slug]}
          />
        </li>
      {/each}
    </ul>
  </div>
</DocsDemo>
