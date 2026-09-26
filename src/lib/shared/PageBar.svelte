<script lang="ts">
  import type { Component } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import type { IconProps } from '$lib/components/icons/icon';
  import type { ReadingDirection } from './layout-kind';
  import { scrubStep, turnsSide } from './page-bar';
  import './page-bar.css';

  type ShownTurn = {
    readonly icon: Component<IconProps>;
    readonly label: string;
    readonly enabled: boolean;
    readonly go: () => void;
  };

  type Props = {
    readonly first: ShownTurn | null;
    readonly second: ShownTurn | null;
    readonly steps: number;
    readonly at: number;
    readonly direction: ReadingDirection;
    readonly enabled: boolean;
    readonly markerAt: (step: number) => string;
    readonly onscrub: (step: number) => void;
    readonly label?: string;
    readonly ticks?: readonly number[];
  };

  const NO_TICKS: readonly number[] = [];

  let {
    first,
    second,
    steps,
    at,
    direction,
    enabled,
    markerAt,
    onscrub,
    label = 'Go to page',
    ticks = NO_TICKS,
  }: Props = $props();

  let preview = $state<number | null>(null);

  const shown = $derived(preview ?? at);
  const marker = $derived(markerAt(shown));
  const side = $derived(turnsSide(direction));

  function previewed(value: string): void {
    preview = scrubStep(value, steps);
  }

  function committed(value: string): void {
    const step = scrubStep(value, steps);
    preview = null;
    if (step !== null && step !== at) onscrub(step);
  }
</script>

{#snippet turn(shown: ShownTurn | null)}
  {#if shown !== null}
    <Button
      variant="ghost"
      size="sm"
      square
      class="shrink-0"
      disabled={!shown.enabled}
      title={shown.label}
      onclick={shown.go}
    >
      <shown.icon class="btn-icon" />
      <span class="visually-hidden">{shown.label}</span>
    </Button>
  {/if}
{/snippet}

{#snippet scrub(shape: string)}
  <input
    class={shape}
    type="range"
    min={0}
    max={Math.max(steps - 1, 0)}
    step={1}
    value={shown}
    dir={direction}
    disabled={!enabled || steps < 2}
    aria-label={label}
    aria-valuetext={marker}
    oninput={(event) => previewed(event.currentTarget.value)}
    onchange={(event) => committed(event.currentTarget.value)}
  />
{/snippet}

{#snippet turns()}
  {#if first !== null || second !== null}
    <div class="row items-center gap-1 shrink-0" role="group" aria-label="Turn the page">
      {@render turn(first)}
      {@render turn(second)}
    </div>
  {/if}
{/snippet}

<div class="page-bar row items-center gap-2 flex-1">
  {#if side === 'before'}
    {@render turns()}
    <p class="mono text-xs text-muted shrink-0">{marker}</p>
  {/if}

  {#if ticks.length === 0}
    {@render scrub('scrub flex-1')}
  {:else}
    <div class="gauge relative flex-1">
      {@render scrub('scrub w-full')}
      {#each ticks as offset, slot (slot)}
        <span class="tick" aria-hidden="true" style:--at="{offset}%"></span>
      {/each}
    </div>
  {/if}

  {#if side === 'after'}
    <p class="mono text-xs text-muted shrink-0">{marker}</p>
    {@render turns()}
  {/if}
</div>
