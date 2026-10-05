<script lang="ts">
  import Dropdown from '$lib/ui/components/Dropdown.svelte';
  import DropdownItem from '$lib/ui/components/DropdownItem.svelte';
  import DropdownSeparator from '$lib/ui/components/DropdownSeparator.svelte';
  import Menu from '$lib/ui/components/icons/Menu.svelte';
  import { readAppearance } from '$lib/ui/core/appearance.js';
  import type { Appearance } from '$lib/ui/core/appearance.js';
  import AppearanceChoices from '$lib/shared/AppearanceChoices.svelte';
  import { LIBRARY_SECTIONS } from './library-sections';

  type Props = {
    readonly onsearcheverything?: (() => void) | undefined;
  };

  let { onsearcheverything }: Props = $props();

  let appearance = $state<Appearance>(readAppearance(document.documentElement));
</script>

<Dropdown variant="ghost" align="end" square chevron={false} icon={Menu} label="Menu">
  {#each LIBRARY_SECTIONS as section (section.href)}
    <DropdownItem href={section.href} current={section.current}>{section.name}</DropdownItem>
  {/each}
  {#if onsearcheverything !== undefined}
    <DropdownSeparator />
    <DropdownItem onclick={onsearcheverything}>Search everything</DropdownItem>
  {/if}
  <DropdownSeparator />
  <AppearanceChoices bind:appearance />
</Dropdown>
