<script lang="ts">
  import type { Component } from 'svelte';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import DropdownLabel from '$lib/components/DropdownLabel.svelte';
  import DropdownSeparator from '$lib/components/DropdownSeparator.svelte';
  import type { IconProps } from '$lib/components/icons/icon';
  import Moon from '$lib/components/icons/Moon.svelte';
  import Sun from '$lib/components/icons/Sun.svelte';
  import SunMoon from '$lib/components/icons/SunMoon.svelte';
  import { COLOR_SCHEMES, THEMES, readAppearance } from './appearance';
  import type { Appearance, ColorScheme, Theme } from './appearance';
  import { chooseAppearance } from './saved-appearance';

  const THEME_LABELS: Readonly<Record<Theme, string>> = {
    base: 'Base',
    ember: 'Ember',
    mono: 'Mono',
    forge: 'Forge',
    crayon: 'Crayon',
    moss: 'Moss',
  };

  const SCHEME_LABELS: Readonly<Record<ColorScheme, string>> = {
    automatic: 'Automatic',
    light: 'Light',
    dark: 'Dark',
  };

  const SCHEME_ICONS: Readonly<Record<ColorScheme, Component<IconProps>>> = {
    automatic: SunMoon,
    light: Sun,
    dark: Moon,
  };

  const uid = $props.id();

  let appearance = $state<Appearance>(readAppearance(document.documentElement));

  const SchemeIcon = $derived(SCHEME_ICONS[appearance.colorScheme]);

  function choose(event: MouseEvent, next: Appearance): void {
    event.preventDefault();
    appearance = next;
    chooseAppearance(document.documentElement, next);
  }
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
  <div role="group" aria-labelledby="{uid}-theme">
    <DropdownLabel id="{uid}-theme">Theme</DropdownLabel>
    {#each THEMES as theme (theme)}
      <DropdownItem
        selected={appearance.theme === theme}
        onclick={(event) => choose(event, { ...appearance, theme })}
        >{THEME_LABELS[theme]}</DropdownItem
      >
    {/each}
  </div>
  <DropdownSeparator />
  <div role="group" aria-labelledby="{uid}-scheme">
    <DropdownLabel id="{uid}-scheme">Color scheme</DropdownLabel>
    {#each COLOR_SCHEMES as colorScheme (colorScheme)}
      <DropdownItem
        selected={appearance.colorScheme === colorScheme}
        onclick={(event) => choose(event, { ...appearance, colorScheme })}
        >{SCHEME_LABELS[colorScheme]}</DropdownItem
      >
    {/each}
  </div>
</Dropdown>
