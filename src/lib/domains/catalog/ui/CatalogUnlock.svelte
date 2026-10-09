<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import type { Catalog } from '../domain/catalog';
  import CatalogPasswordModal from './CatalogPasswordModal.svelte';
  import { PASSWORD_NEEDED_TEXT } from './catalog-texts';
  import { createUnlock } from './unlock.svelte';

  type Props = {
    readonly catalog: Catalog;
    readonly refused: boolean;
    readonly onunlock: (password: string) => void;
  };

  let { catalog, refused, onunlock }: Props = $props();

  const unlock = createUnlock();
</script>

<EmptyState message={PASSWORD_NEEDED_TEXT}>
  {#snippet action()}
    <Button variant="primary" onclick={() => unlock.ask()}>Enter password</Button>
  {/snippet}
</EmptyState>
{#if unlock.prompt.kind === 'asking'}
  <CatalogPasswordModal {catalog} {refused} {onunlock} ondismiss={() => unlock.dismiss()} />
{/if}
