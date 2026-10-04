<script lang="ts">
  import { onDestroy } from 'svelte';
  import { match } from 'ts-pattern';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import MarqueeSelection from '$lib/components/MarqueeSelection.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import type { GestureInput, GestureSample } from '$lib/components/gesture';
  import { GestureFeed } from '$lib/components/gesture-feed';
  import { marqueeEnd } from '$lib/components/marquee-selection';
  import type { MarqueeEnd, MarqueeRect } from '$lib/components/marquee-selection';
  import { MIN_SELECTION_PX } from '$lib/domains/viewing/domain/selection';
  import { clickSlop } from '$lib/shared/click-slop';
  import { SAMPLE_PAGE_SIZE } from '../../../domain/ocr-sample';
  import DocsDemo from '../../DocsDemo.svelte';
  import samplePage from '../ocr/sample-page.png';
  import './touch-demos.css';

  type Logged = { readonly end: MarqueeEnd; readonly pointer: string };

  const KEPT = 6;

  const DRAWS_WITH = ['mouse', 'pen'];

  let surface = $state<HTMLDivElement | null>(null);
  let marquee = $state<ReturnType<typeof MarqueeSelection> | null>(null);
  let selectMode = $state(false);
  let pointer = $state('mouse');
  let live = $state.raw<MarqueeRect | null>(null);
  let ends = $state.raw<readonly Logged[]>([]);

  const gestures = new GestureFeed(feed);

  const preview = $derived(
    live === null
      ? null
      : marqueeEnd(
          { x: live.x, y: live.y },
          { x: live.x + live.width, y: live.y + live.height },
          clickSlop(pointer),
          MIN_SELECTION_PX,
        ),
  );

  function sizeText(rect: MarqueeRect): string {
    return `${Math.round(rect.width)} × ${Math.round(rect.height)} px`;
  }

  function endBadge(end: MarqueeEnd): 'success' | 'warning' | 'neutral' {
    return match(end)
      .with({ kind: 'click' }, () => 'neutral' as const)
      .with({ kind: 'too-small' }, () => 'warning' as const)
      .with({ kind: 'selection' }, () => 'success' as const)
      .exhaustive();
  }

  function endText(end: MarqueeEnd, pointerType: string): string {
    return match(end)
      .with({ kind: 'click' }, () => `inside the ${clickSlop(pointerType)} px slop`)
      .with(
        { kind: 'too-small' },
        ({ selection }) => `${sizeText(selection)}, under ${MIN_SELECTION_PX} px on one axis`,
      )
      .with({ kind: 'selection' }, ({ selection }) => sizeText(selection))
      .exhaustive();
  }

  function ended(end: MarqueeEnd): void {
    live = null;
    ends = [{ end, pointer }, ...ends].slice(0, KEPT);
    match(end)
      .with({ kind: 'selection' }, ({ selection }) => marquee?.keep(selection))
      .with({ kind: 'click' }, { kind: 'too-small' }, () => marquee?.reset())
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
      .with(
        { kind: 'none' },
        { kind: 'tap' },
        { kind: 'double-tap' },
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
    pointer = event.pointerType;
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
    if (pointer === 'touch') event.preventDefault();
  }

  onDestroy(() => gestures.stop());
</script>

<DocsDemo label="Drawing a selection">
  {#snippet controls()}
    <Button
      size="sm"
      variant="ghost"
      onclick={() => {
        marquee?.reset();
        ends = [];
      }}>Clear</Button
    >
  {/snippet}
  {#snippet caption()}
    The rectangle is the real <code>MarqueeSelection</code> with the image reader's own slop (<code
      >clickSlop</code
    >) and minimum (<code>MIN_SELECTION_PX</code>). A mouse or pen draws at once; a finger draws
    after a long press, or at once in Select mode, through the real classifier. The selection is
    kept here only; no capture is made.
  {/snippet}
  <div class="touch-demo stack-md">
    <Toggle bind:checked={selectMode}>Select mode</Toggle>
    <div class="grid-2 gap-4">
      <div
        bind:this={surface}
        class="surface relative bordered"
        role="application"
        aria-label="Sample page. Drag a rectangle to select a region."
        {onpointerdown}
        {onpointermove}
        {onpointerup}
        {onpointercancel}
        {oncontextmenu}
      >
        <img
          src={samplePage}
          alt="A two-panel sample manga page"
          width={SAMPLE_PAGE_SIZE.width}
          height={SAMPLE_PAGE_SIZE.height}
          draggable="false"
        />
        <MarqueeSelection
          bind:this={marquee}
          within={surface}
          pointerTypes={DRAWS_WITH}
          slop={clickSlop}
          minimum={MIN_SELECTION_PX}
          label={preview === null ? undefined : preview.kind}
          ondraw={(selection) => (live = selection)}
          onend={ended}
        />
      </div>
      <div class="stack-sm text-sm min-w-0">
        <p class="m-0">
          Slop for <code>{pointer}</code>: {clickSlop(pointer)} px. Minimum: {MIN_SELECTION_PX} px.
        </p>
        {#if live !== null && preview !== null}
          <p class="m-0">
            Drawing {sizeText(live)}, which would end as <code>{preview.kind}</code>.
          </p>
        {/if}
        <ol class="col gap-2 m-0" aria-live="polite">
          {#each ends as logged, index (index)}
            <li class="row wrap items-center gap-2">
              <Badge variant={endBadge(logged.end)}>{logged.end.kind}</Badge>
              <span class="text-xs">{logged.pointer}: {endText(logged.end, logged.pointer)}</span>
            </li>
          {:else}
            <li class="text-muted">Click, or drag a small and a large rectangle.</li>
          {/each}
        </ol>
      </div>
    </div>
  </div>
</DocsDemo>
