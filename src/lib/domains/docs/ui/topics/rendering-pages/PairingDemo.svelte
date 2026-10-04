<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import BreakpointProbe from '$lib/components/BreakpointProbe.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import type { SegmentOption } from '$lib/components/segmented-control';
  import type {
    ImageLayoutKind,
    PagePairingChoice,
    ReadingDirection,
  } from '$lib/shared/layout-kind';
  import { sizeFigure } from '../../../domain/bitmap-memory';
  import DocsDemo from '../../DocsDemo.svelte';
  import { pairingScene } from './pairing-playground';
  import type { Orientation, ScreenPreset } from './pairing-playground';
  import './pairing-demo.css';

  const SCREENS: readonly SegmentOption<ScreenPreset>[] = [
    { value: 'phone', label: 'Phone' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'laptop', label: 'Laptop' },
  ];

  const ORIENTATIONS: readonly SegmentOption<Orientation>[] = [
    { value: 'portrait', label: 'Portrait' },
    { value: 'landscape', label: 'Landscape' },
  ];

  const CHOICES: readonly SegmentOption<PagePairingChoice>[] = [
    { value: 'auto', label: 'Automatic' },
    { value: 'single', label: 'One page' },
    { value: 'double', label: 'Two pages' },
    { value: 'double-after-cover', label: 'Two, cover alone' },
  ];

  const DIRECTIONS: readonly SegmentOption<ReadingDirection>[] = [
    { value: 'rtl', label: 'Right to left' },
    { value: 'ltr', label: 'Left to right' },
  ];

  const LAYOUTS: readonly SegmentOption<ImageLayoutKind>[] = [
    { value: 'paged', label: 'Pages' },
    { value: 'continuous', label: 'Strip' },
  ];

  let screen = $state<ScreenPreset>('phone');
  let orientation = $state<Orientation>('portrait');
  let choice = $state<PagePairingChoice>('auto');
  let direction = $state<ReadingDirection>('rtl');
  let layout = $state<ImageLayoutKind>('paged');
  let compactWidth = $state(0);

  const scene = $derived(
    pairingScene({ screen, orientation, choice, direction, layout, compactWidth }),
  );
</script>

<DocsDemo label="Page pairing with the real functions">
  <BreakpointProbe breakpoint="--breakpoint-compact" bind:width={compactWidth} />
  <div class="row wrap gap-3">
    <SegmentedControl label="Screen" variant="track" options={SCREENS} bind:value={screen} />
    <SegmentedControl
      label="Orientation"
      variant="track"
      options={ORIENTATIONS}
      bind:value={orientation}
    />
    <SegmentedControl label="Layout" variant="track" options={LAYOUTS} bind:value={layout} />
    <SegmentedControl label="Page pairing" variant="track" options={CHOICES} bind:value={choice} />
    <SegmentedControl
      label="Reading direction"
      variant="track"
      options={DIRECTIONS}
      bind:value={direction}
    />
  </div>
  <p class="row wrap items-center gap-2 m-0 text-sm">
    <span>Reading area</span>
    <Badge>{sizeFigure(scene.viewport)}</Badge>
    <span>against a compact breakpoint of</span>
    <Badge>{compactWidth} px</Badge>
    <span>is</span>
    <Badge variant="info">{scene.screenWidth}</Badge>
    <span>so the pairing is</span>
    <Badge variant="info">{scene.pairing}</Badge>
    <span>read</span>
    <Badge variant="info">{scene.direction}</Badge>
  </p>
  <div class="rendering-pairing-demo">
    <ol
      class={['spreads list-reset m-0', { 'is-rtl': scene.direction === 'rtl' }]}
      aria-label="The groups, in reading order"
    >
      {#each scene.groups as group, at (at)}
        <li
          class={[
            'spread surface-sunken bordered rounded-control',
            { 'is-rtl': scene.direction === 'rtl' },
          ]}
          aria-label={`Group ${at + 1}: ${group.map((sheet) => `page ${sheet.index + 1}`).join(' and ')}`}
        >
          {#each group as sheet (sheet.index)}
            <span
              class={[
                'sheet bordered text-xs',
                sheet.wide ? 'surface-bright text-accent' : 'surface-bright',
              ]}
              style:--sheet-ratio={sheet.size.width / sheet.size.height}
            >
              {sheet.index + 1}
            </span>
          {/each}
        </li>
      {/each}
    </ol>
  </div>
  {#snippet caption()}
    A nine-image book whose fifth image is a two-page spread drawn as one wide picture. The groups
    come from <code>effectivePairing</code> and <code>pairPages</code>, and the narrow or wide
    answer from the same <code>isNarrow</code> test against <code>--breakpoint-compact</code> that the
    reading screen runs on its reading area.
  {/snippet}
</DocsDemo>
