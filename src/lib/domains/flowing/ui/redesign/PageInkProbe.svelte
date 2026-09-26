<script lang="ts">
  import { untrack } from 'svelte';
  import type { PageInk } from '../flow-styles';
  import { pageInk } from './page-ink';
  import './page-ink-probe.css';

  type Props = {
    readonly onink: (ink: PageInk) => void;
  };

  let { onink }: Props = $props();

  const PREFERS_DARK = '(prefers-color-scheme: dark)';

  const APPEARANCE_ATTRIBUTES: readonly string[] = ['data-theme', 'data-color-scheme'];

  let probe = $state<HTMLElement | null>(null);
  let link = $state<HTMLElement | null>(null);
  let selection = $state<HTMLElement | null>(null);

  function readInk(page: HTMLElement, linked: HTMLElement, selected: HTMLElement): void {
    const around = getComputedStyle(page);
    onink(
      pageInk({
        declaredScheme: around.colorScheme,
        prefersDark: window.matchMedia(PREFERS_DARK).matches,
        text: around.color,
        link: getComputedStyle(linked).color,
        selection: getComputedStyle(selected).color,
      }),
    );
  }

  $effect(() => {
    const page = probe;
    const linked = link;
    const selected = selection;
    if (page === null || linked === null || selected === null) return;

    const read = (): void => readInk(page, linked, selected);
    const preference = window.matchMedia(PREFERS_DARK);
    const appearance = new MutationObserver(read);
    appearance.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [...APPEARANCE_ATTRIBUTES],
    });
    preference.addEventListener('change', read);
    untrack(read);

    return () => {
      appearance.disconnect();
      preference.removeEventListener('change', read);
    };
  });
</script>

<span class="page-ink-probe visually-hidden" aria-hidden="true" bind:this={probe}>
  <span class="ink-link" bind:this={link}></span>
  <span class="ink-selection" bind:this={selection}></span>
</span>
