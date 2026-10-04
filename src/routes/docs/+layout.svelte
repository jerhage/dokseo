<script lang="ts">
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';

  let { children } = $props();
</script>

<div class="surface-bg min-h-screen">
  <div class="row justify-end px-4 py-2"><AppearanceSwitcher /></div>
  <main class="page-wrap pb-8">{@render children()}</main>
</div>
