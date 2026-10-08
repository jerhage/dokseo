<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import type { CatalogDownloads } from './catalog-downloads.svelte';

  type Props = { readonly downloads: CatalogDownloads };

  let { downloads }: Props = $props();

  let open = $state(true);
</script>

<Modal
  bind:open
  title="Replace with newer version?"
  size="sm"
  onclose={() => downloads.dismissReplacement()}
>
  <p class="text-sm">
    Download the newer file and replace the one on this device? Your captures stay with the book,
    but the newer file may have different pages, so a capture can point at the wrong place.
  </p>

  {#snippet footer(close)}
    <Button onclick={close}>Cancel</Button>
    <Button variant="primary" onclick={() => void downloads.confirmReplacement()}>
      Download and replace
    </Button>
  {/snippet}
</Modal>
