<script lang="ts">
  import { onDestroy } from 'svelte';
  import { match } from 'ts-pattern';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import type { GestureSample } from '$lib/components/gesture';
  import { SIDE_ZONE_SHARE, tapZone } from '$lib/shared/page-turn';
  import type { TouchTurns } from '$lib/shared/page-turn';
  import type { GestureReading, SwipeCheck } from '../../../domain/gesture-reading';
  import DocsDemo from '../../DocsDemo.svelte';
  import { GesturePad } from './gesture-pad.svelte';
  import './touch-demos.css';

  const TURN_OPTIONS = [
    { value: 'tap-zones', label: 'Tap zones' },
    { value: 'swipe-only', label: 'Swipe only' },
  ] as const;

  let pad = $state<HTMLDivElement | null>(null);
  let mouseAsFinger = $state(true);
  let selectMode = $state(false);
  let doubleTaps = $state(true);
  let turns = $state<TouchTurns>('tap-zones');
  let lastPointer = '';

  const gestures = new GesturePad({
    context: () => ({
      pannable: false,
      selectMode,
      waitsForDoubleTap: (at) =>
        doubleTaps && tapZone(at.x, pad?.clientWidth ?? 0, 'tap-zones') === 'centre',
    }),
    area: () => ({ width: pad?.clientWidth ?? 0, turns }),
  });

  function fed(kind: GestureSample['kind'], event: PointerEvent): void {
    const element = pad;
    if (element === null) return;
    if (kind === 'move' && event.pointerType !== 'touch' && event.buttons === 0) return;

    lastPointer = event.pointerType;
    if (kind === 'down') {
      element.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
    const box = element.getBoundingClientRect();
    gestures.pointer(kind, {
      pointerId: event.pointerId,
      pointerType: mouseAsFinger ? 'touch' : event.pointerType,
      clientX: event.clientX - box.left,
      clientY: event.clientY - box.top,
    });
  }

  function oncontextmenu(event: MouseEvent): void {
    if (lastPointer === 'touch') event.preventDefault();
  }

  function fixed(value: number, digits = 0): string {
    return value.toFixed(digits);
  }

  function swipeText(check: SwipeCheck): string {
    const axis = check.sideways ? 'sideways' : 'too steep';
    const fling = match(check.fling)
      .with('distance', () => 'far enough')
      .with('speed', () => 'fast enough')
      .with('neither', () => 'too short and slow')
      .exhaustive();
    return `${fixed(check.across)} across, ${fixed(check.along)} down: ${axis}, ${fling}`;
  }

  function turnText(reading: GestureReading): string | null {
    const check = reading.swipe;
    if (check === null) return null;
    if (check.turn === null) return 'no turn';

    return `turns to the page on the ${check.turn}`;
  }

  onDestroy(() => gestures.stop());
</script>

<DocsDemo label="Gesture pad">
  {#snippet controls()}
    <Button size="sm" variant="ghost" onclick={() => gestures.clear()}>Clear</Button>
  {/snippet}
  {#snippet caption()}
    Every sample goes through the real <code>GestureFeed</code> and <code>gestureStep</code>; the
    turn is the real <code>swipeTurn</code>, with the pad standing in for the screen. With the first
    switch on, a mouse or pen is sent as a finger, because the classifier ignores every other
    pointer type.
  {/snippet}
  <div class="touch-demo stack-md">
    <div class="row wrap gap-4">
      <Toggle bind:checked={mouseAsFinger}>Mouse and pen act as a finger</Toggle>
      <Toggle bind:checked={selectMode}>Select mode</Toggle>
      <Toggle bind:checked={doubleTaps}>Center waits for a double tap</Toggle>
      <SegmentedControl label="Page turns" options={TURN_OPTIONS} bind:value={turns} />
    </div>
    <div
      bind:this={pad}
      class="surface pad-zones aspect-video surface-sunken bordered rounded-container text-sm text-faint"
      style:--side-share={SIDE_ZONE_SHARE}
      role="application"
      aria-label="Gesture pad. Tap, hold, swipe or drag here."
      onpointerdown={(event) => fed('down', event)}
      onpointermove={(event) => fed('move', event)}
      onpointerup={(event) => fed('up', event)}
      onpointercancel={(event) => fed('cancel', event)}
      {oncontextmenu}
    >
      <span class="col items-center justify-center">side</span>
      <span class={['col items-center justify-center', { 'surface-raised': doubleTaps }]}
        >{doubleTaps ? 'center waits' : 'center'}</span
      >
      <span class="col items-center justify-center">side</span>
    </div>
    <p class="m-0 text-sm">State <code>{gestures.state}</code></p>
    <div class="grid-2 gap-4">
      <div class="stack-sm min-w-0">
        <h3 class="text-sm m-0">Gestures</h3>
        <ol class="col gap-2 text-sm m-0" aria-live="polite">
          {#each gestures.readings as reading, index (index)}
            <li class="col gap-1">
              <span class="row wrap items-center gap-2">
                <Badge variant={reading.kind === 'swipe' ? 'success' : 'neutral'}
                  >{reading.kind}</Badge
                >
                <span class="mono text-xs"
                  >{fixed(reading.distance)} px, {fixed(reading.duration)} ms{reading.speed === null
                    ? ''
                    : `, ${fixed(reading.speed, 2)} px/ms`}</span
                >
              </span>
              {#if reading.swipe !== null}
                <span class="text-xs text-muted"
                  >{swipeText(reading.swipe)}; {turnText(reading)}</span
                >
              {/if}
            </li>
          {:else}
            <li class="text-muted">Tap, hold, swipe or drag on the pad.</li>
          {/each}
        </ol>
      </div>
      <div class="stack-sm min-w-0">
        <h3 class="text-sm m-0">Trace</h3>
        <ol class="trace col gap-1 mono text-xs m-0">
          {#each gestures.trace as line, index (index)}
            <li>{line.text}{line.repeats > 1 ? ` (×${line.repeats})` : ''}</li>
          {/each}
        </ol>
      </div>
    </div>
  </div>
</DocsDemo>
