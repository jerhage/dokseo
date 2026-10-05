<script lang="ts">
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import Toggle from '$lib/ui/components/Toggle.svelte';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import type { TouchTurns } from '$lib/shared/page-turn';
  import { SAMPLE_PAGE_SIZE } from '../../../domain/ocr-sample';
  import { zoneBands, zoneOutcome, zoneOutcomeLabel } from '../../../domain/touch-zones';
  import type { ZoneOutcome, ZonePointer, ZoneScene } from '../../../domain/touch-zones';
  import DocsDemo from '../../DocsDemo.svelte';
  import samplePage from '../ocr/sample-page.png';
  import './touch-demos.css';

  type Hit = { readonly x: number; readonly y: number; readonly outcome: ZoneOutcome };

  const DIRECTIONS = [
    { value: 'ltr', label: 'Left to right' },
    { value: 'rtl', label: 'Right to left' },
  ] as const;

  const POINTERS = [
    { value: 'touch', label: 'Finger' },
    { value: 'mouse', label: 'Mouse' },
  ] as const;

  const TURNS = [
    { value: 'tap-zones', label: 'Tap zones and swipe' },
    { value: 'swipe-only', label: 'Swipe only' },
  ] as const;

  let direction = $state<ReadingDirection>('rtl');
  let pointer = $state<ZonePointer>('touch');
  let turns = $state<TouchTurns>('tap-zones');
  let edgeClicks = $state(true);
  let chromeShown = $state(false);
  let hit = $state.raw<Hit | null>(null);

  const scene: ZoneScene = $derived({ pointer, turns, edgeClicks, direction, chromeShown });
  const bands = $derived(zoneBands(scene));

  function percent(fraction: number): string {
    return `${(fraction * 100).toFixed(1)}%`;
  }

  function placed(event: PointerEvent): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;

    const box = target.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    hit = { x, y, outcome: zoneOutcome(x, scene) };
  }
</script>

<DocsDemo label="Tap zones on a page">
  {#snippet caption()}
    Each band's action is the result at its middle, and a press anywhere on the page asks again at
    that point. A finger goes through the real <code>tapZone</code>, a mouse through the real
    <code>CLICK_EDGE_SHARE</code>, and both through the real <code>towards</code>.
  {/snippet}
  <div class="touch-demo stack-md">
    <div class="row wrap gap-4">
      <SegmentedControl label="Reading direction" options={DIRECTIONS} bind:value={direction} />
      <SegmentedControl label="Pointer" options={POINTERS} bind:value={pointer} />
    </div>
    <div class="row wrap gap-4">
      {#if pointer === 'touch'}
        <SegmentedControl label="Page turns" options={TURNS} bind:value={turns} />
        <Toggle bind:checked={chromeShown}>Bars showing</Toggle>
      {:else}
        <Toggle bind:checked={edgeClicks}>Click page edges to turn</Toggle>
      {/if}
    </div>
    <div class="grid-2 gap-4">
      <div
        class="surface relative bordered"
        role="application"
        aria-label="Sample page. Press anywhere to see what a tap or click there does."
        onpointerdown={placed}
      >
        <img
          src={samplePage}
          alt="A two-panel sample manga page"
          width={SAMPLE_PAGE_SIZE.width}
          height={SAMPLE_PAGE_SIZE.height}
          draggable="false"
        />
        {#each bands as band (band.from)}
          <div
            class={[
              'band col items-center justify-center text-xs weight-medium',
              { 'band-centre': band.outcome === 'menu' || band.outcome === 'hide-menu' },
            ]}
            style:--band-from={percent(band.from)}
            style:--band-width={percent(band.to - band.from)}
          >
            <span class="surface-raised rounded-control px-2 py-1"
              >{zoneOutcomeLabel(band.outcome)}</span
            >
          </div>
        {/each}
        {#if hit !== null}
          <span class="mark" style:--mark-x={percent(hit.x)} style:--mark-y={percent(hit.y)}></span>
        {/if}
      </div>
      <div class="stack-sm text-sm">
        {#if hit === null}
          <p class="m-0 text-muted">Press anywhere on the page.</p>
        {:else}
          <p class="m-0">
            At {percent(hit.x)} across: <strong>{zoneOutcomeLabel(hit.outcome)}</strong>
          </p>
        {/if}
        <ul class="m-0">
          {#each bands as band (band.from)}
            <li>{percent(band.from)} to {percent(band.to)}: {zoneOutcomeLabel(band.outcome)}</li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
</DocsDemo>
