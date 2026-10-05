<script lang="ts">
  import type { Snippet } from 'svelte';
  import Badge from '../components/Badge.svelte';

  type Props = {
    readonly appearanceControl?: Snippet | undefined;
  };

  let { appearanceControl }: Props = $props();
</script>

<header class="layout-app-shell-header wrap">
  <div class="row items-center gap-2">
    <strong class="display">Component library</strong>
    <Badge variant="primary">dev</Badge>
  </div>
  {@render appearanceControl?.()}
</header>
