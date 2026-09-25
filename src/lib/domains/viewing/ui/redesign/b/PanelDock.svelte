<script lang="ts">
  import type { Snippet } from 'svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import { dockName, dockTally, dockToggle } from './panel-dock';
  import type { DockPlacement } from './panel-dock';
  import './panel-dock.css';

  type Props = {
    readonly placement: DockPlacement;
    readonly count: number | null;
    readonly panel: Snippet;
    readonly ontoggle: () => void;
  };

  let { placement, count, panel, ontoggle }: Props = $props();

  const uid = $props.id();

  const toggle = $derived(dockToggle(placement));
  const beside = $derived(placement === 'side' || placement === 'rail');
  const tally = $derived(dockTally(placement, count));
  const name = $derived(dockName(placement, count));
</script>

<aside
  class={[
    'panel-dock gap-0 min-h-0 shrink-0 scheme-dark surface',
    `is-${placement}`,
    beside ? 'row border-s' : 'col border-t',
  ]}
  aria-label="Captures"
>
  {#if beside}
    <Button
      variant="ghost"
      size="sm"
      class="rail-toggle col items-center gap-2 px-1 py-2 shrink-0 border-e"
      aria-expanded={toggle.open}
      aria-controls="{uid}-panel"
      aria-label={name}
      title={name}
      onclick={ontoggle}
    >
      <span aria-hidden="true">{toggle.glyph}</span>
      {#if tally !== null}
        <Badge aria-hidden="true">{tally}</Badge>
      {/if}
    </Button>
  {:else}
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
      <span aria-hidden="true">{toggle.glyph}</span>
      {toggle.open ? toggle.label : 'Captures'}
      {#if tally !== null}
        <Badge aria-hidden="true">{tally}</Badge>
      {/if}
    </Button>
  {/if}

  <div class="panel-slot row gap-0 flex-1 min-h-0" id="{uid}-panel" hidden={!toggle.open}>
    {@render panel()}
  </div>
</aside>
