<script lang="ts">
  import { onDestroy } from 'svelte';
  import { match } from 'ts-pattern';
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import MarqueeSelection from '../components/MarqueeSelection.svelte';
  import Toggle from '../components/Toggle.svelte';
  import { TOUCH_SLOP_PX } from '../components/gesture';
  import type { GestureInput, GestureSample } from '../components/gesture';
  import { GestureFeed } from '../components/gesture-feed';
  import type { MarqueeEnd, MarqueeRect } from '../components/marquee-selection';
  import DemoSection from './DemoSection.svelte';
  import './marquee-selection-section.css';

  const KEPT = 6;

  const CLICK_SLOP_PX = 3;

  const MINIMUM_PX = 12;

  const DRAWS_WITH = ['mouse', 'pen'];

  let surface = $state<HTMLDivElement | null>(null);
  let marquee = $state<ReturnType<typeof MarqueeSelection> | null>(null);
  let accent = $state(false);
  let labelled = $state(false);
  let selectMode = $state(false);
  let heard = $state.raw<readonly string[]>([]);
  let lastPointer = '';

  const gestures = new GestureFeed(feed);

  function slop(pointerType: string): number {
    return pointerType === 'touch' ? TOUCH_SLOP_PX : CLICK_SLOP_PX;
  }

  function hear(line: string): void {
    heard = [line, ...heard].slice(0, KEPT);
  }

  function described(rect: MarqueeRect): string {
    return `${Math.round(rect.width)} × ${Math.round(rect.height)} at ${Math.round(rect.x)},${Math.round(rect.y)}`;
  }

  function ended(end: MarqueeEnd): void {
    match(end)
      .with({ kind: 'click' }, () => hear('click'))
      .with({ kind: 'too-small' }, ({ selection }) => hear(`too-small ${described(selection)}`))
      .with({ kind: 'selection' }, ({ selection }) => {
        marquee?.keep(selection);
        hear(`selection ${described(selection)}`);
      })
      .exhaustive();
  }

  function selectingId(): number | null {
    const state = gestures.state;
    return state.kind === 'selecting' ? state.id : null;
  }

  function feed(input: GestureInput): void {
    const step = gestures.step(input, {
      pannable: false,
      selectMode,
      waitsForDoubleTap: () => false,
    });
    const id = selectingId();
    match(step.intent)
      .with({ kind: 'long-press' }, ({ x, y }) => {
        if (id !== null) marquee?.beginAt(id, { x, y }, { x, y });
      })
      .with({ kind: 'select-begin' }, ({ from, to }) => {
        if (id !== null) marquee?.beginAt(id, from, to);
      })
      .with({ kind: 'select-move' }, ({ x, y }) => marquee?.extendTo({ x, y }))
      .with({ kind: 'select-end' }, ({ x, y }) => marquee?.endAt({ x, y }))
      .with({ kind: 'cancel' }, () => marquee?.abandon())
      .with({ kind: 'tap' }, { kind: 'double-tap' }, () => hear('tap'))
      .with(
        { kind: 'none' },
        { kind: 'pan' },
        { kind: 'pan-end' },
        { kind: 'pinch' },
        { kind: 'swipe' },
        () => undefined,
      )
      .exhaustive();
  }

  function feedTouch(kind: GestureSample['kind'], event: PointerEvent): void {
    feed(gestures.sample(kind, event));
  }

  function onpointerdown(event: PointerEvent): void {
    lastPointer = event.pointerType;
    if (event.pointerType !== 'touch') {
      marquee?.pointerdown(event);
      return;
    }

    surface?.setPointerCapture(event.pointerId);
    event.preventDefault();
    feedTouch('down', event);
  }

  function onpointermove(event: PointerEvent): void {
    if (event.pointerType === 'touch') feedTouch('move', event);
    else marquee?.pointermove(event);
  }

  function onpointerup(event: PointerEvent): void {
    if (event.pointerType === 'touch') feedTouch('up', event);
    else marquee?.pointerup(event);
  }

  function onpointercancel(event: PointerEvent): void {
    if (event.pointerType === 'touch') feedTouch('cancel', event);
    else marquee?.pointercancel(event);
  }

  function oncontextmenu(event: MouseEvent): void {
    if (lastPointer === 'touch') event.preventDefault();
  }

  onDestroy(() => gestures.stop());
</script>

<DemoSection
  id="marquee-selection"
  title="Marquee selection"
  classes={[
    'marquee-selection',
    'marquee-selection-box',
    'marquee-selection-handle',
    'marquee-selection-label',
  ]}
>
  <p class="text-sm text-muted">
    Drag a rectangle with a mouse or a pen. A release inside the {CLICK_SLOP_PX} px slop is a click, one
    under {MINIMUM_PX} px on either axis is too small, and anything larger is a selection. Touch drives
    it through <code>gestureStep</code>: a long press, or any drag in Select mode, draws; the slop
    is then {TOUCH_SLOP_PX} px. Dismiss drops the kept selection and reports it, as Escape does.
  </p>
  <div class="row wrap gap-4">
    <Toggle bind:checked={accent}>Accent</Toggle>
    <Toggle bind:checked={labelled}>Label</Toggle>
    <Toggle bind:checked={selectMode}>Select mode</Toggle>
    <Button size="sm" onclick={() => marquee?.dismiss()}>Dismiss</Button>
  </div>
  <div class="marquee-selection-section grid-2">
    <Card>
      <div
        bind:this={surface}
        class="surface relative aspect-video surface-sunken bordered rounded-container"
        role="application"
        aria-label="Marquee surface"
        {onpointerdown}
        {onpointermove}
        {onpointerup}
        {onpointercancel}
        {oncontextmenu}
      >
        <MarqueeSelection
          bind:this={marquee}
          within={surface}
          pointerTypes={DRAWS_WITH}
          {slop}
          minimum={MINIMUM_PX}
          {accent}
          label={labelled ? 'Label' : undefined}
          onend={ended}
          onrefuse={(refusal) => hear(refusal.kind)}
          onclick={() => hear('click reported')}
          ondismiss={() => hear('dismissed')}
        />
      </div>
    </Card>
    <Card>
      <ol class="col gap-1 text-sm mono" aria-live="polite">
        {#each heard as line, index (index)}
          <li>{line}</li>
        {:else}
          <li class="text-muted">Draw on the surface.</li>
        {/each}
      </ol>
    </Card>
  </div>
</DemoSection>
