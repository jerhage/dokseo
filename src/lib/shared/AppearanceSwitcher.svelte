<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Divider from '$lib/components/Divider.svelte';
  import { COLOR_SCHEMES, THEMES, applyAppearance, readAppearance } from './appearance';
  import type { Appearance, ColorScheme, Theme } from './appearance';

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

  let appearance = $state<Appearance>(readAppearance(document.documentElement));

  function choose(next: Appearance): void {
    appearance = next;
    applyAppearance(document.documentElement, next);
  }
</script>

<div class="row wrap items-center gap-4">
  <div class="row wrap items-center gap-1" role="group" aria-label="Theme">
    {#each THEMES as theme (theme)}
      <Button
        size="sm"
        variant="ghost"
        active={appearance.theme === theme}
        aria-pressed={appearance.theme === theme}
        onclick={() => choose({ ...appearance, theme })}>{THEME_LABELS[theme]}</Button
      >
    {/each}
  </div>
  <Divider vertical />
  <div class="row items-center gap-1" role="group" aria-label="Color scheme">
    {#each COLOR_SCHEMES as colorScheme (colorScheme)}
      <Button
        size="sm"
        variant="ghost"
        active={appearance.colorScheme === colorScheme}
        aria-pressed={appearance.colorScheme === colorScheme}
        onclick={() => choose({ ...appearance, colorScheme })}>{SCHEME_LABELS[colorScheme]}</Button
      >
    {/each}
  </div>
</div>
