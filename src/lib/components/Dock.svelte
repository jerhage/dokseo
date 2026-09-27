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
  import { dockLabel, dockName, dockTally, dockToggle } from './dock';
  import type { DockPlacement } from './dock';

  type Props = {
    readonly placement: DockPlacement;
    readonly count?: number | null;
    readonly label: string;
    readonly showLabel: string;
    readonly hideLabel: string;
    readonly children: Snippet;
    readonly ontoggle: () => void;
  };

  let {
    placement,
    count = null,
    label,
    showLabel,
    hideLabel,
    children,
    ontoggle,
  }: Props = $props();

  const uid = $props.id();

  const words = $derived({ showLabel, hideLabel });
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

<aside
  class={[
    'dock gap-0 min-h-0 shrink-0 surface',
    `dock-${placement}`,
    beside ? 'row border-s' : 'col border-t',
  ]}
  aria-label={label}
>
  {#if beside}
    <IconButton
      variant="ghost"
      size="sm"
      square={false}
      class="dock-rail-toggle col items-center gap-2 px-1 py-2 shrink-0 border-e"
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
      <Arrow class="btn-icon" />
      {toggle.open ? dockLabel(placement, words) : label}
      {#if tally !== null}
        <Badge aria-hidden="true">{tally}</Badge>
      {/if}
    </Button>
  {/if}

  <div class="dock-panel row gap-0 min-h-0" id="{uid}-panel" hidden={!toggle.open}>
    {@render children()}
  </div>
</aside>
