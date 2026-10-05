<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import { NARROW_SCREEN_QUERY } from '$lib/ui/components/breakpoints';
  import EngineSettingsPage from './EngineSettingsPage.svelte';
  import SettingsSectionList from './SettingsSectionList.svelte';

  const narrowScreen = new MediaQuery(NARROW_SCREEN_QUERY);
</script>

{#if narrowScreen.current}
  <SettingsSectionList />
{:else}
  <EngineSettingsPage />
{/if}
