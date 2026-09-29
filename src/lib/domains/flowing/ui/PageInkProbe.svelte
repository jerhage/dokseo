<script lang="ts">
  import { untrack } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import type { PageInk } from './flow-styles';
  import { pageInk } from './page-ink';
  import './page-ink-probe.css';

  type Props = {
    readonly onink: (ink: PageInk) => void;
  };

  let { onink }: Props = $props();

  const PREFERS_DARK = '(prefers-color-scheme: dark)';

  const APPEARANCE_ATTRIBUTES: readonly string[] = ['data-theme', 'data-color-scheme'];

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

  const watchInk: Attachment<HTMLElement> = (page) => {
    const linked = page.querySelector('.ink-link');
    const selected = page.querySelector('.ink-selection');
    if (!(linked instanceof HTMLElement) || !(selected instanceof HTMLElement)) return;

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
  };
</script>

<span class="page-ink-probe visually-hidden" aria-hidden="true" {@attach watchInk}>
  <span class="ink-link"></span>
  <span class="ink-selection"></span>
</span>
