<script lang="ts">
  import { onMount } from 'svelte';
  import Slider from '$lib/ui/components/Slider.svelte';
  import {
    SAMPLE_SENTENCE,
    charactersThatFit,
    chFont,
    formatCount,
    formatPixels,
    lengthIn,
  } from '../../../domain/ch-unit';
  import type { ChFontSlug } from '../../../domain/ch-unit';
  import DocsDemo from '../../DocsDemo.svelte';
  import './ch-unit.css';
  import { loadChFonts } from './load-fonts';
  import MeasuredBox from './MeasuredBox.svelte';

  const SLUGS: readonly ChFontSlug[] = ['dm-sans', 'archivo', 'zen-kaku-gothic-new'];

  const ZEROS = '0'.repeat(10);

  const FONTS = SLUGS.map((slug) => chFont(slug));

  let ch = $state(30);
  let boxes = $state<Record<string, DOMRectReadOnly | undefined>>({});
  let zeros = $state<Record<string, DOMRectReadOnly | undefined>>({});
  let sentences = $state<Record<string, DOMRectReadOnly | undefined>>({});

  onMount(() => {
    void loadChFonts();
  });
</script>

<DocsDemo label="Zeros and letters in the same box">
  {#snippet caption()}
    Every box is the same ch value wide. The first line of each is zeros, the second is an English
    sentence, both cut off at the box edge. The counts divide the box width by the measured average
    advance of ten zeros and of the whole sentence.
  {/snippet}
  <div class="ch-demo stack-md">
    <Slider
      label="Box width in ch"
      value={ch}
      min={20}
      max={60}
      valuetext="{ch} ch"
      oninput={(event) => (ch = Number(event.currentTarget.value))}
    />
    {#each FONTS as font (font.slug)}
      {@const box = boxes[font.slug]?.width ?? 0}
      <div class="stack-sm">
        <p class="m-0 text-sm">
          <strong>{font.label}</strong>
          <span class="mono text-muted">{formatPixels(box)}</span>
        </p>
        <div class="overflow-auto">
          <div
            class="ch-box bordered rounded-control surface-sunken font-text"
            style:--box-length={lengthIn('ch', ch)}
            style:--demo-font={font.stack}
          >
            <div>{ZEROS.repeat(12)}</div>
            <div>{SAMPLE_SENTENCE.repeat(2)}</div>
          </div>
        </div>
        <p class="m-0 text-sm">
          About
          <strong
            >{formatCount(
              charactersThatFit(box, zeros[font.slug]?.width ?? 0, ZEROS.length),
            )}</strong
          >
          zeros, about
          <strong
            >{formatCount(
              charactersThatFit(box, sentences[font.slug]?.width ?? 0, SAMPLE_SENTENCE.length),
            )}</strong
          >
          letters of English.
        </p>
        <MeasuredBox
          stack={font.stack}
          inlineSize={lengthIn('ch', ch)}
          bind:rect={boxes[font.slug]}
        />
        <MeasuredBox stack={font.stack} text={ZEROS} bind:rect={zeros[font.slug]} />
        <MeasuredBox stack={font.stack} text={SAMPLE_SENTENCE} bind:rect={sentences[font.slug]} />
      </div>
    {/each}
  </div>
</DocsDemo>
