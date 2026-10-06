<script lang="ts">
  import AppearanceSwitcher from '../components/AppearanceSwitcher.svelte';
  import ToastRegion from '../components/ToastRegion.svelte';
  import { setToaster } from '../components/toast-context';
  import { createToaster } from '../components/toaster.svelte';
  import { applyAppearance, pinnedScheme, readAppearance } from '../core/appearance.js';
  import type { Appearance } from '../core/appearance.js';
  import { APPEARANCE_KEYS } from './appearance-keys';
  import Playground from './Playground.svelte';

  setToaster(createToaster());

  let appearance: Appearance = $state(readAppearance(document.documentElement));

  function save(chosen: Appearance): void {
    applyAppearance(document.documentElement, chosen);
    try {
      localStorage.setItem(APPEARANCE_KEYS.themeKey, chosen.theme);
      const pinned = pinnedScheme(chosen.colorScheme);
      if (pinned === undefined) localStorage.removeItem(APPEARANCE_KEYS.schemeKey);
      else localStorage.setItem(APPEARANCE_KEYS.schemeKey, pinned);
    } catch {
      return;
    }
  }
</script>

<Playground>
  {#snippet appearanceControl()}
    <AppearanceSwitcher bind:appearance onchoose={save} />
  {/snippet}
</Playground>

<ToastRegion />
