<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import type { ReadingDirection } from '$lib/shared/layout-kind';
  import { scrubStep } from './page-scrubber';
  import './page-bar.css';

  type ShownTurn = {
    readonly glyph: string;
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
  };

  let { first, second, steps, at, direction, enabled, markerAt, onscrub }: Props = $props();

  let preview = $state<number | null>(null);

  const shown = $derived(preview ?? at);
  const marker = $derived(markerAt(shown));

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
      <span aria-hidden="true">{shown.glyph}</span>
      <span class="visually-hidden">{shown.label}</span>
    </Button>
  {/if}
{/snippet}

<div class="page-bar row items-center gap-2 flex-1">
  {@render turn(first)}

  <p class="mono text-xs text-muted shrink-0">{marker}</p>

  <input
    class="scrub flex-1"
    type="range"
    min={0}
    max={Math.max(steps - 1, 0)}
    step={1}
    value={shown}
    dir={direction}
    disabled={!enabled || steps < 2}
    aria-label="Go to page"
    aria-valuetext={marker}
    oninput={(event) => previewed(event.currentTarget.value)}
    onchange={(event) => committed(event.currentTarget.value)}
  />

  {@render turn(second)}
</div>
