<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import type { CatalogBrowseView } from './catalog-browse.svelte';
  import CatalogPasswordModal from './CatalogPasswordModal.svelte';
  import { PASSWORD_NEEDED_TEXT } from './catalog-texts';

  type Props = { readonly view: CatalogBrowseView; readonly refused: boolean };

  let { view, refused }: Props = $props();

  let asking = $state(true);
</script>

<EmptyState message={PASSWORD_NEEDED_TEXT}>
  {#snippet action()}
    <Button variant="primary" onclick={() => (asking = true)}>Enter password</Button>
  {/snippet}
</EmptyState>
{#if asking}
  <CatalogPasswordModal {view} {refused} ondismiss={() => (asking = false)} />
{/if}
