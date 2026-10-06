<script lang="ts">
  import Field from '../components/Field.svelte';
  import SegmentedControl from '../components/SegmentedControl.svelte';
  import Select from '../components/Select.svelte';
  import ToastRegion from '../components/ToastRegion.svelte';
  import { setToaster } from '../components/toast-context';
  import { createToaster } from '../components/toaster.svelte';
  import {
    COLOR_SCHEMES,
    THEMES,
    applyAppearance,
    pinnedScheme,
    readAppearance,
  } from '../core/appearance.js';
  import type { Appearance, ColorScheme } from '../core/appearance.js';
  import { APPEARANCE_KEYS } from './appearance-keys';
  import Playground from './Playground.svelte';

  const SCHEME_LABELS: Readonly<Record<ColorScheme, string>> = {
    automatic: 'Automatic',
    light: 'Light',
    dark: 'Dark',
  };

  const schemeOptions = COLOR_SCHEMES.map((scheme) => ({
    value: scheme,
    label: SCHEME_LABELS[scheme],
  }));

  setToaster(createToaster());

  let appearance: Appearance = $state(readAppearance(document.documentElement));

  function choose(chosen: Appearance): void {
    appearance = chosen;
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

  function chooseTheme(name: string): void {
    const theme = THEMES.find((known) => known === name);
    if (theme !== undefined) choose({ ...appearance, theme });
  }
</script>

<Playground>
  {#snippet appearanceControl()}
    <div class="row items-center gap-2">
      <Field label="Theme" hideLabel>
        {#snippet children(control)}
          <Select
            {...control}
            value={appearance.theme}
            onchange={(event) => chooseTheme(event.currentTarget.value)}
          >
            {#each THEMES as theme (theme)}
              <option value={theme}>{theme}</option>
            {/each}
          </Select>
        {/snippet}
      </Field>
      <SegmentedControl
        label="Colour scheme"
        variant="track"
        options={schemeOptions}
        value={appearance.colorScheme}
        onvaluechange={(colorScheme) => choose({ ...appearance, colorScheme })}
      />
    </div>
  {/snippet}
</Playground>

<ToastRegion />
