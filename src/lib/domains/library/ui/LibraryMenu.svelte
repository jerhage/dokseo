<script lang="ts">
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import DropdownSeparator from '$lib/components/DropdownSeparator.svelte';
  import Menu from '$lib/components/icons/Menu.svelte';
  import { readAppearance } from '$lib/shared/appearance';
  import type { Appearance } from '$lib/shared/appearance';
  import AppearanceChoices from '$lib/shared/AppearanceChoices.svelte';
  import { LIBRARY_SECTIONS } from './library-sections';

  type Props = {
    readonly onsearcheverything?: (() => void) | undefined;
  };

  let { onsearcheverything }: Props = $props();

  let appearance = $state<Appearance>(readAppearance(document.documentElement));
</script>

<Dropdown variant="ghost" align="end" square chevron={false}>
  {#snippet trigger()}
    <Menu class="btn-icon" />
    <span class="visually-hidden">Menu</span>
  {/snippet}
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
