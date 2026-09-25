<script lang="ts">
  import type { Snippet } from 'svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import { dockToggle } from './panel-dock';
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
  const tally = $derived(count !== null && count > 0 && !toggle.open ? count : null);
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
    <div class="col items-center gap-2 p-1 shrink-0 border-e">
      <Button
        variant="ghost"
        size="sm"
        square
        aria-expanded={toggle.open}
        aria-controls="{uid}-panel"
        title={toggle.label}
        onclick={ontoggle}
      >
        <span aria-hidden="true">{toggle.glyph}</span>
        <span class="visually-hidden">{toggle.label}</span>
      </Button>
      {#if tally !== null}
        <Badge>{tally}</Badge>
      {/if}
    </div>
  {:else}
    <Button
      variant="ghost"
      size="sm"
      block
      class="shrink-0"
      aria-expanded={toggle.open}
      aria-controls="{uid}-panel"
      onclick={ontoggle}
    >
      <span aria-hidden="true">{toggle.glyph}</span>
      {toggle.open ? toggle.label : 'Captures'}
      {#if tally !== null}
        <Badge>{tally}</Badge>
      {/if}
    </Button>
  {/if}

  <div class="panel-slot row gap-0 flex-1 min-h-0" id="{uid}-panel" hidden={!toggle.open}>
    {@render panel()}
  </div>
</aside>
