<script lang="ts">
  import type { Snippet } from 'svelte';
  import { match } from 'ts-pattern';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import IconButton from './IconButton.svelte';
  import ChevronDown from './icons/ChevronDown.svelte';
  import ChevronLeft from './icons/ChevronLeft.svelte';
  import ChevronRight from './icons/ChevronRight.svelte';
  import ChevronUp from './icons/ChevronUp.svelte';
  import {
    DOCK_DETENTS,
    DOCK_DETENT_TOKENS,
    dockCover,
    dockLabel,
    dockName,
    dockTally,
    dockToggle,
  } from './dock';
  import type { DockPlacement } from './dock';
  import { DockSheet } from './dock-sheet.svelte';
  import type { DockPointer } from './dock-sheet.svelte';

  type Props = {
    readonly placement: DockPlacement;
    readonly count?: number | undefined;
    readonly label: string;
    readonly expandLabel: string;
    readonly collapseLabel: string;
    readonly resizeLabel: string;
    readonly children: Snippet;
    readonly ontoggle: () => void;
    cover?: number;
  };

  let {
    placement,
    count,
    label,
    expandLabel,
    collapseLabel,
    resizeLabel,
    children,
    ontoggle,
    cover = $bindable(0),
  }: Props = $props();

  const uid = $props.id();

  const sheet = new DockSheet(() => ontoggle());

  let panel = $state<HTMLDivElement | null>(null);

  function measureDrawer(drawer: HTMLDivElement): () => void {
    const observer = new ResizeObserver(() => {
      cover = dockCover(drawer.offsetHeight, drawer.parentElement?.offsetHeight ?? 0);
    });
    observer.observe(drawer);
    return () => {
      observer.disconnect();
      cover = 0;
    };
  }

  function pointerOf(event: PointerEvent): DockPointer {
    return { id: event.pointerId, y: event.clientY, t: event.timeStamp };
  }

  function onhandledown(event: PointerEvent): void {
    const handle = event.currentTarget;
    if (!event.isPrimary || !(handle instanceof HTMLElement) || panel === null) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    if (sheet.press(pointerOf(event), panel.getBoundingClientRect().height)) {
      handle.setPointerCapture(event.pointerId);
    }
  }

  function onhandlemove(event: PointerEvent): void {
    sheet.follow(pointerOf(event));
  }

  function onhandleup(event: PointerEvent): void {
    sheet.release(pointerOf(event));
  }

  function onhandlecancel(event: PointerEvent): void {
    sheet.cancel(event.pointerId);
  }

  function onhandleclick(event: MouseEvent): void {
    sheet.activate(event.detail === 0);
  }

  function onhandlekeydown(event: KeyboardEvent): void {
    if (sheet.key(event.key)) event.preventDefault();
  }

  const words = $derived({ label, expandLabel, collapseLabel });
  const toggle = $derived(dockToggle(placement));
  const beside = $derived(placement === 'side' || placement === 'rail');
  const tally = $derived(dockTally(placement, count));
  const name = $derived(dockName(placement, count, words));
  const Arrow = $derived(
    match(toggle.points)
      .with('left', () => ChevronLeft)
      .with('right', () => ChevronRight)
      .with('up', () => ChevronUp)
      .with('down', () => ChevronDown)
      .exhaustive(),
  );
</script>

{#snippet region()}
  <div
    class={['dock-panel row gap-0 min-h-0', { 'is-dragging': sheet.dragging }]}
    id="{uid}-panel"
    hidden={!toggle.open}
    style:--dock-sheet-height={placement === 'sheet' ? sheet.height : undefined}
    bind:this={panel}
  >
    {@render children()}
  </div>
{/snippet}

<aside
  class={[
    'dock gap-0 min-h-0 shrink-0',
    `dock-${placement}`,
    beside ? 'row border-s surface' : 'col',
  ]}
  aria-label={label}
>
  {#if beside}
    <IconButton
      variant="ghost"
      size="sm"
      square={false}
      class="dock-toggle col items-center gap-2 px-1 py-2 shrink-0 border-e"
      aria-expanded={toggle.open}
      aria-controls="{uid}-panel"
      label={name}
      onclick={ontoggle}
    >
      <Arrow class="btn-icon" />
      {#if tally !== null}
        <Badge aria-hidden="true">{tally}</Badge>
      {/if}
    </IconButton>
    {@render region()}
  {:else}
    <div class="dock-drawer col gap-0 surface border-t" {@attach measureDrawer}>
      {#if toggle.open}
        <Button
          variant="ghost"
          size="sm"
          block
          class="dock-handle shrink-0"
          aria-controls="{uid}-panel"
          aria-label={resizeLabel}
          onpointerdown={onhandledown}
          onpointermove={onhandlemove}
          onpointerup={onhandleup}
          onpointercancel={onhandlecancel}
          onclick={onhandleclick}
          onkeydown={onhandlekeydown}
        >
          <span class="dock-handle-grip" aria-hidden="true"></span>
        </Button>
        {#each DOCK_DETENTS as detent (detent)}
          <div
            class="dock-probe"
            aria-hidden="true"
            style:--dock-probe-height="var({DOCK_DETENT_TOKENS[detent]})"
            bind:clientHeight={sheet.heights[detent]}
          ></div>
        {/each}
      {/if}
      <Button
        variant="ghost"
        size="sm"
        block
        class="shrink-0"
        aria-expanded={toggle.open}
        aria-controls="{uid}-panel"
        aria-label={name}
        onclick={ontoggle}
      >
        <Arrow class="btn-icon" />
        {toggle.open ? dockLabel(placement, words) : label}
        {#if tally !== null}
          <Badge aria-hidden="true">{tally}</Badge>
        {/if}
      </Button>
      {@render region()}
    </div>
  {/if}
</aside>
