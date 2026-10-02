<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import type { RemovedBook } from '../domain/book/removed-book';
  import { DELETED_CAPTURES_FATE, removedBookName } from './removed-books';

  type Props = {
    readonly book: RemovedBook;
    readonly deleting: boolean;
    readonly ondelete: () => void;
    readonly onclose: () => void;
  };

  let { book, deleting, ondelete, onclose }: Props = $props();

  let open = $state(true);

  function requestOpen(next: boolean): void {
    if (deleting) return;
    open = next;
  }
</script>

<Modal bind:open={() => open, requestOpen} title="Delete these captures?" size="sm" {onclose}>
  <p class="text-sm">
    The captures kept from
    <strong lang={book.language}>{removedBookName(book)}</strong>
    {DELETED_CAPTURES_FATE}
  </p>

  {#snippet footer(close)}
    <Button disabled={deleting} onclick={close}>Cancel</Button>
    <Button variant="danger" disabled={deleting} onclick={ondelete}>
      {deleting ? 'Deleting…' : 'Delete captures'}
    </Button>
  {/snippet}
</Modal>
