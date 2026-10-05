<script lang="ts">
  import type { Component } from 'svelte';
  import Dropdown from '$lib/ui/components/Dropdown.svelte';
  import type { IconProps } from '$lib/ui/components/icons/icon';
  import Moon from '$lib/ui/components/icons/Moon.svelte';
  import Sun from '$lib/ui/components/icons/Sun.svelte';
  import SunMoon from '$lib/ui/components/icons/SunMoon.svelte';
  import { readAppearance } from '$lib/ui/core/appearance.js';
  import type { Appearance, ColorScheme } from '$lib/ui/core/appearance.js';
  import AppearanceChoices from './AppearanceChoices.svelte';
  import { SCHEME_LABELS, THEME_LABELS } from './appearance-labels';

  const SCHEME_ICONS: Readonly<Record<ColorScheme, Component<IconProps>>> = {
    automatic: SunMoon,
    light: Sun,
    dark: Moon,
  };

  let appearance = $state<Appearance>(readAppearance(document.documentElement));

  const SchemeIcon = $derived(SCHEME_ICONS[appearance.colorScheme]);
</script>

<Dropdown variant="ghost" size="sm" align="end">
  {#snippet trigger()}
    <SchemeIcon class="btn-icon" />
    <span class="visually-hidden">Appearance:</span>
    {THEME_LABELS[appearance.theme]}
    <span class="visually-hidden"
      >theme, {SCHEME_LABELS[appearance.colorScheme].toLowerCase()} color scheme</span
    >
  {/snippet}
  <AppearanceChoices bind:appearance />
</Dropdown>
