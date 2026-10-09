<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import type { RemovalTarget } from './catalog-dialog.svelte';
  import type { CatalogSettingsView } from './catalog-settings.svelte';

  type Props = { readonly view: CatalogSettingsView; readonly removal: RemovalTarget };

  let { view, removal }: Props = $props();

  let open = $state(true);

  function requestOpen(next: boolean): void {
    if (view.removeBusy) return;
    open = next;
  }
</script>

<Modal
  bind:open={() => open, requestOpen}
  title="Remove this catalog?"
  size="sm"
  onclose={() => view.dismissRemove()}
>
  <p class="text-sm">
    <strong>{removal.name}</strong> will be removed from Dokseo. Books you downloaded from it stay in
    your library.
  </p>

  {#snippet footer(close)}
    <Button disabled={view.removeBusy} onclick={close}>Cancel</Button>
    <Button variant="danger" disabled={view.removeBusy} onclick={() => view.confirmRemove()}>
      {view.removeBusy ? 'Removing…' : 'Remove'}
    </Button>
  {/snippet}
</Modal>
