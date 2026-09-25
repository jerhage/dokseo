<script lang="ts">
  import { untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import { ChromeFocus } from './chrome-focus.svelte';
  import { chromeShown } from './reader-chrome';
  import './reader-bars.css';

  type BarPlacement = 'stacked' | 'floating';

  type Props = {
    readonly placement: BarPlacement;
    readonly startShown: boolean;
    readonly header: Snippet;
    readonly footer: Snippet;
    readonly between?: Snippet;
    readonly heldOpen?: boolean;
  };

  const { placement, startShown, header, footer, between, heldOpen = false }: Props = $props();

  let topBar = $state<HTMLElement | null>(null);
  let bottomBar = $state<HTMLElement | null>(null);
  let topHeight = $state(0);
  let bottomHeight = $state(0);
  let asked = $state(untrack(() => startShown));

  function openPopovers(): readonly Element[] {
    try {
      return [...document.querySelectorAll(':popover-open')];
    } catch {
      return [];
    }
  }

  const focus = new ChromeFocus(
    () => [topBar, bottomBar],
    () => [document.activeElement, ...openPopovers()],
  );

  const bar = 'reader-bar row items-center surface scheme-dark hushable';
  const fit = $derived(
    placement === 'stacked'
      ? { both: 'stacked shrink-0 gap-4 px-responsive py-3', top: '', bottom: '' }
      : { both: 'z-raised gap-3 px-4 py-2', top: 'pin-top', bottom: 'pin-bottom' },
  );
  const awake = $derived(chromeShown(asked, focus.held || heldOpen));

  export function shown(): boolean {
    return awake;
  }

  export function toggle(): void {
    asked = !awake;
  }

  $effect(() => {
    function refresh(): void {
      focus.refresh();
    }

    window.addEventListener('focusin', refresh);
    window.addEventListener('focusout', refresh);
    window.addEventListener('toggle', refresh, true);

    return () => {
      window.removeEventListener('focusin', refresh);
      window.removeEventListener('focusout', refresh);
      window.removeEventListener('toggle', refresh, true);
    };
  });
</script>

<header
  class={[bar, 'top border-b', fit.both, fit.top, { 'is-hushed': !awake }]}
  inert={!awake}
  bind:this={topBar}
  bind:offsetHeight={topHeight}
  style:--rise="{-topHeight}px"
>
  <Button href="/" size="sm" class="shrink-0">
    <span aria-hidden="true">‹</span>
    Library
  </Button>
  {@render header()}
</header>

{@render between?.()}

<footer
  class={[bar, 'bottom border-t', fit.both, fit.bottom, { 'is-hushed': !awake }]}
  inert={!awake}
  bind:this={bottomBar}
  bind:offsetHeight={bottomHeight}
  style:--drop="{-bottomHeight}px"
>
  {@render footer()}
</footer>
