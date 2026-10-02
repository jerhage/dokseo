<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import type { RemovedShelfEntry } from '../domain/book/removed-book';
  import { captureCountText, deletedCapturesFate, removedEntryName } from './removed-books';

  type Props = {
    readonly entry: RemovedShelfEntry;
    readonly deleting: boolean;
    readonly ondelete: () => void;
    readonly onclose: () => void;
  };

  let { entry, deleting, ondelete, onclose }: Props = $props();

  let open = $state(true);

  function requestOpen(next: boolean): void {
    if (deleting) return;
    open = next;
  }
</script>

<Modal bind:open={() => open, requestOpen} title="Delete these captures?" size="sm" {onclose}>
  <p class="text-sm">
    The {captureCountText(entry.captureCount)} kept from
    <strong lang={entry.kind === 'recorded' ? entry.book.language : undefined}
      >{removedEntryName(entry)}</strong
    >
    {deletedCapturesFate(entry.captureCount)}
  </p>

  {#snippet footer(close)}
    <Button disabled={deleting} onclick={close}>Cancel</Button>
    <Button variant="danger" disabled={deleting} onclick={ondelete}>
      {deleting ? 'Deleting…' : 'Delete captures'}
    </Button>
  {/snippet}
</Modal>
