<script lang="ts">
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';

  let { children } = $props();
</script>

<div class="surface-bg min-h-screen">
  <div class="row wrap items-center justify-end gap-2 px-4 py-2 surface">
    <AppearanceSwitcher />
  </div>
  {@render children()}
</div>
