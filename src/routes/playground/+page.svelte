<script lang="ts">
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import PageTitle from '$lib/shared/PageTitle.svelte';
  import Playground from '$lib/ui/playground/Playground.svelte';
</script>

<PageTitle screen="Component library" />

<Playground>
  {#snippet appearanceControl()}
    <AppearanceSwitcher />
  {/snippet}
</Playground>
