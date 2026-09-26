<script lang="ts">
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import DropdownLabel from '$lib/components/DropdownLabel.svelte';
  import DropdownSeparator from '$lib/components/DropdownSeparator.svelte';
  import { COLOR_SCHEMES, THEMES } from './appearance';
  import type { Appearance } from './appearance';
  import { SCHEME_LABELS, THEME_LABELS } from './appearance-labels';
  import { chooseAppearance } from './saved-appearance';

  type Props = {
    appearance: Appearance;
  };

  let { appearance = $bindable() }: Props = $props();

  const uid = $props.id();

  function choose(event: MouseEvent, next: Appearance): void {
    event.preventDefault();
    appearance = next;
    chooseAppearance(document.documentElement, next);
  }
</script>

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
