<script lang="ts">
  import { onMount } from 'svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import Slider from '$lib/ui/components/Slider.svelte';
  import { CH_FONTS, chFont, formatPixels, lengthIn } from '../../../domain/ch-unit';
  import type { ChFontSlug, RelativeUnit } from '../../../domain/ch-unit';
  import DocsDemo from '../../DocsDemo.svelte';
  import './ch-unit.css';
  import { loadChFonts } from './load-fonts';
  import MeasuredBox from './MeasuredBox.svelte';

  const UNITS: readonly RelativeUnit[] = ['em', 'rem', 'ch', 'ic'];

  const AMOUNT = 20;

  let slug = $state<ChFontSlug>('zen-kaku-gothic-new');
  let size = $state(16);
  let rects = $state<Record<string, DOMRectReadOnly | undefined>>({});

  const font = $derived(chFont(slug));
  const widest = $derived(Math.max(1, ...UNITS.map((unit) => rects[unit]?.width ?? 0)));

  onMount(() => {
    void loadChFonts();
  });
</script>

<DocsDemo label="Twenty of each unit">
  {#snippet caption()}
    The root font size stays at its own value, so <code>rem</code> does not move when the element's
    font size or font changes. <code>ic</code> is defined as the width of 水 in the first available font.
  {/snippet}
  <div class="ch-demo stack-md">
    <div class="grid-2 gap-2">
      <Field label="Font">
        {#snippet children(control)}
          <Select {...control} bind:value={slug}>
            {#each CH_FONTS as option (option.slug)}
              <option value={option.slug}>{option.label}</option>
            {/each}
          </Select>
        {/snippet}
      </Field>
      <Slider
        label="Element font size"
        value={size}
        min={12}
        max={32}
        valuetext="{size} pixels"
        oninput={(event) => (size = Number(event.currentTarget.value))}
      />
    </div>
    <ul class="stack-sm list-reset">
      {#each UNITS as unit (unit)}
        {@const width = rects[unit]?.width ?? 0}
        <li class="stack-sm">
          <div class="row wrap items-center justify-between gap-2">
            <code>{lengthIn(unit, AMOUNT)}</code>
            <span class="mono text-sm">{formatPixels(width)}</span>
          </div>
          <div class="bar-track" style:--bar-share={width / widest}>
            <div class="bar"></div>
          </div>
          <MeasuredBox
            stack={font.stack}
            fontSize="{size}px"
            inlineSize={lengthIn(unit, AMOUNT)}
            bind:rect={rects[unit]}
          />
        </li>
      {/each}
    </ul>
  </div>
</DocsDemo>
