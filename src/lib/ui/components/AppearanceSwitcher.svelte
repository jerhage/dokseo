<script lang="ts">
  import type { Component } from 'svelte';
  import type { Appearance, ColorScheme } from '../core/appearance.js';
  import { SCHEME_LABELS, THEME_LABELS } from './appearance-labels';
  import AppearanceChoices from './AppearanceChoices.svelte';
  import type { ButtonVariant, ControlSize, MenuAlign } from './classes';
  import Dropdown from './Dropdown.svelte';
  import type { IconProps } from './icons/icon';
  import Moon from './icons/Moon.svelte';
  import Sun from './icons/Sun.svelte';
  import SunMoon from './icons/SunMoon.svelte';

  type Props = {
    appearance: Appearance;
    onchoose?: ((appearance: Appearance) => void) | undefined;
    variant?: ButtonVariant;
    size?: ControlSize;
    align?: MenuAlign;
  };

  let {
    appearance = $bindable(),
    onchoose,
    variant = 'ghost',
    size = 'sm',
    align = 'end',
  }: Props = $props();

  const SCHEME_ICONS: Readonly<Record<ColorScheme, Component<IconProps>>> = {
    automatic: SunMoon,
    light: Sun,
    dark: Moon,
  };

  const SchemeIcon = $derived(SCHEME_ICONS[appearance.colorScheme]);
</script>

<Dropdown {variant} {size} {align}>
  {#snippet trigger()}
    <SchemeIcon class="btn-icon" />
    <span class="visually-hidden">Appearance:</span>
    {THEME_LABELS[appearance.theme]}
    <span class="visually-hidden"
      >theme, {SCHEME_LABELS[appearance.colorScheme].toLowerCase()} color scheme</span
    >
  {/snippet}
  <AppearanceChoices bind:appearance {onchoose} />
</Dropdown>
