<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
</script>

<header class="layout-app-shell-header wrap">
  <div class="row items-center gap-2">
    <strong class="display">Component library</strong>
    <Badge variant="brand">dev</Badge>
  </div>
  <AppearanceSwitcher />
</header>
