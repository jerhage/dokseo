<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import { BookCapturesExport } from '$lib/shared/book-captures-export.svelte';
  import type { BookCapturesExporting } from '$lib/shared/book-captures-export.svelte';
  import BookCapturesExportButton from '$lib/shared/BookCapturesExportButton.svelte';
  import { DELETED_CAPTURES_FATE } from './removed-books';
  import type { RemovedEntry } from './removed-books';

  type Props = {
    readonly book: RemovedEntry;
    readonly deleting: boolean;
    readonly exporting: BookCapturesExporting;
    readonly ondelete: () => void;
    readonly onclose: () => void;
  };

  let { book, deleting, exporting, ondelete, onclose }: Props = $props();

  let open = $state(true);
  const capturesExport = new BookCapturesExport({
    exportBookCaptures: (id) => exporting.exportBookCaptures(id),
  });

  onMount(() => {
    void capturesExport.prepare(book.id);
  });

  function requestOpen(next: boolean): void {
    if (deleting) return;
    open = next;
  }
</script>

<Modal bind:open={() => open, requestOpen} title="Delete these captures?" size="sm" {onclose}>
  <p class="text-sm">
    The captures kept from
    <strong lang={book.language ?? undefined}>{book.name}</strong>
    {DELETED_CAPTURES_FATE}
  </p>

  <BookCapturesExportButton view={capturesExport} />

  {#snippet footer(close)}
    <Button disabled={deleting} onclick={close}>Cancel</Button>
    <Button variant="danger" disabled={deleting} onclick={ondelete}>
      {deleting ? 'Deleting…' : 'Delete captures'}
    </Button>
  {/snippet}
</Modal>
