<script lang="ts">
  import { onDestroy } from 'svelte';
  import Card from '../components/Card.svelte';
  import Toggle from '../components/Toggle.svelte';
  import { DOUBLE_TAP_MS, LONG_PRESS_MS, TOUCH_SLOP_PX } from '../components/gesture';
  import type { GestureInput, GestureIntent, GestureSample, Point } from '../components/gesture';
  import { GestureFeed } from '../components/gesture-feed';
  import DemoSection from './DemoSection.svelte';
  import './gesture-section.css';

  const KEPT = 8;

  let pad = $state<HTMLDivElement | null>(null);
  let pannable = $state(false);
  let selectMode = $state(false);
  let doubleTaps = $state(true);
  let phase = $state('idle');
  let heard = $state.raw<readonly string[]>([]);
  let lastPointer = '';

  const gestures = new GestureFeed(feed);

  function inMiddleThird(at: Point): boolean {
    const element = pad;
    if (element === null) return false;

    const box = element.getBoundingClientRect();
    const x = at.x - box.left;
    return x >= box.width / 3 && x <= (box.width * 2) / 3;
  }

  function described(intent: GestureIntent): string {
    const { kind, ...fields } = intent;
    const values = Object.entries(fields).map(([name, value]) =>
      typeof value === 'number'
        ? `${name} ${Math.round(value * 100) / 100}`
        : `${name} ${Math.round(value.x)},${Math.round(value.y)}`,
    );
    return [kind, ...values].join(' ');
  }

  function feed(input: GestureInput): void {
    const step = gestures.step(input, {
      pannable,
      selectMode,
      waitsForDoubleTap: (at) => doubleTaps && inMiddleThird(at),
    });
    phase = step.state.kind;
    if (step.intent.kind !== 'none') heard = [described(step.intent), ...heard].slice(0, KEPT);
  }

  function feedPointer(kind: GestureSample['kind'], event: PointerEvent): void {
    lastPointer = event.pointerType;
    if (event.pointerType !== 'touch') return;
    if (kind === 'down') {
      pad?.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
    feed(gestures.sample(kind, event));
  }

  function oncontextmenu(event: MouseEvent): void {
    if (lastPointer === 'touch') event.preventDefault();
  }

  onDestroy(() => gestures.stop());
</script>

<DemoSection id="gesture" title="Gesture" classes={[]}>
  <p class="text-sm text-muted">
    <code>gestureStep</code> reads touch pointers into taps, double taps, long presses, pans,
    swipes, pinches and select drags. A still press becomes a long press at {LONG_PRESS_MS} ms; a finger
    that strays {TOUCH_SLOP_PX} px is no longer a tap; the middle third waits {DOUBLE_TAP_MS} ms for a
    double tap. Touch only: a mouse and a pen are ignored, as in the readers.
  </p>
  <div class="row wrap gap-4">
    <Toggle bind:checked={pannable}>Pannable</Toggle>
    <Toggle bind:checked={selectMode}>Select mode</Toggle>
    <Toggle bind:checked={doubleTaps}>Double taps</Toggle>
  </div>
  <div class="gesture-section grid-2">
    <Card>
      <div
        bind:this={pad}
        class="pad row gap-0 aspect-video surface-sunken bordered rounded-container text-sm text-faint"
        role="application"
        aria-label="Gesture pad"
        onpointerdown={(event) => feedPointer('down', event)}
        onpointermove={(event) => feedPointer('move', event)}
        onpointerup={(event) => feedPointer('up', event)}
        onpointercancel={(event) => feedPointer('cancel', event)}
        {oncontextmenu}
      >
        <span class="flex-1 col items-center justify-center">taps at once</span>
        <span class="flex-1 col items-center justify-center surface-raised">waits</span>
        <span class="flex-1 col items-center justify-center">taps at once</span>
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <code class="text-xs">state {phase}</code>
        <ol class="col gap-1 text-sm mono" aria-live="polite">
          {#each heard as line, index (index)}
            <li>{line}</li>
          {:else}
            <li class="text-muted">Touch the pad.</li>
          {/each}
        </ol>
      </div>
    </Card>
  </div>
</DemoSection>
