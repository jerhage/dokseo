<script lang="ts">
  import { pageTitle } from './page-title';

  type Props = {
    readonly screen: string;
    readonly section?: string | null;
  };

  let { screen, section = null }: Props = $props();
</script>

<svelte:head>
  <title>{pageTitle(screen, section)}</title>
</svelte:head>
