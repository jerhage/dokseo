<script lang="ts">
  import { untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import { ChromeFocus } from './chrome-focus.svelte';
  import { chromeShown } from './reader-chrome';

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

  const stacked = $derived(placement === 'stacked');
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
  class="bar top"
  class:stacked
  class:floating={!stacked}
  class:hushed={!awake}
  inert={!awake}
  bind:this={topBar}
  bind:offsetHeight={topHeight}
  style:--rise="{-topHeight}px"
>
  <a class="back" href="/">
    <span class="glyph" aria-hidden="true">‹</span>
    Library
  </a>
  {@render header()}
</header>

{@render between?.()}

<footer
  class="bar bottom"
  class:stacked
  class:floating={!stacked}
  class:hushed={!awake}
  inert={!awake}
  bind:this={bottomBar}
  bind:offsetHeight={bottomHeight}
  style:--drop="{-bottomHeight}px"
>
  {@render footer()}
</footer>

<style>
  .bar {
    display: flex;
    align-items: center;
    background: var(--c-surface-chrome);
    opacity: 1;
  }

  .bar.hushed {
    opacity: 0;
    pointer-events: none;
  }

  .top {
    border-bottom: 1px solid var(--c-border-1);
  }

  .bottom {
    border-top: 1px solid var(--c-border-1);
  }

  .stacked {
    flex: none;
    gap: var(--s-4);
    padding: var(--s-3) var(--s-5);
    transition:
      margin 200ms ease,
      opacity 200ms ease;
  }

  .stacked.top.hushed {
    margin-block-start: var(--rise);
  }

  .stacked.bottom.hushed {
    margin-block-end: var(--drop);
  }

  .floating {
    position: absolute;
    box-sizing: border-box;
    inset-inline: 0;
    z-index: var(--z-chrome);
    gap: var(--s-3);
    padding: var(--s-2) var(--s-4);
    transition: opacity 200ms ease;
  }

  .floating.top {
    inset-block-start: 0;
  }

  .floating.bottom {
    inset-block-end: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .bar {
      transition: none;
    }
  }

  .back {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--s-1);
    padding: var(--s-1) var(--s-2);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-4);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-size: 11.5px;
    text-decoration: none;
  }

  .back:hover,
  .back:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .glyph {
    display: block;
  }

  @media (max-width: 700px) {
    .stacked {
      padding: var(--s-3) var(--s-4);
    }
  }
</style>
