<script lang="ts">
  import { COLOR_SCHEMES, THEMES } from '../core/appearance.js';
  import type { Appearance } from '../core/appearance.js';
  import { SCHEME_LABELS, THEME_LABELS } from './appearance-labels';
  import DropdownItem from './DropdownItem.svelte';
  import DropdownLabel from './DropdownLabel.svelte';
  import DropdownSeparator from './DropdownSeparator.svelte';

  type Props = {
    appearance: Appearance;
    onchoose?: ((appearance: Appearance) => void) | undefined;
  };

  let { appearance = $bindable(), onchoose }: Props = $props();

  const uid = $props.id();

  function choose(event: MouseEvent, next: Appearance): void {
    event.preventDefault();
    appearance = next;
    onchoose?.(next);
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
