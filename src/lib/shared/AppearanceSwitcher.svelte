<script lang="ts">
  import AppearanceSwitcher from '$lib/ui/components/AppearanceSwitcher.svelte';
  import { readAppearance } from '$lib/ui/core/appearance.js';
  import type { Appearance } from '$lib/ui/core/appearance.js';
  import { chooseAppearance } from './saved-appearance';

  let appearance = $state<Appearance>(readAppearance(document.documentElement));
</script>

<AppearanceSwitcher
  bind:appearance
  onchoose={(next) => chooseAppearance(document.documentElement, next)}
/>
