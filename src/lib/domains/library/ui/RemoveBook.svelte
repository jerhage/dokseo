<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import type { Book } from '../domain/book/book';

  type Props = {
    readonly book: Book;
    readonly removing: boolean;
    readonly onremove: () => void;
    readonly onclose: () => void;
  };

  let { book, removing, onremove, onclose }: Props = $props();

  let open = $state(true);

  function requestOpen(next: boolean): void {
    if (removing) return;
    open = next;
  }
</script>

<Modal bind:open={() => open, requestOpen} title="Remove this upload?" size="sm" {onclose}>
  <p class="text-sm">
    <strong lang={book.language}>{book.title}</strong> will be removed from your library.
  </p>

  {#snippet footer(close)}
    <Button disabled={removing} onclick={close}>Cancel</Button>
    <Button variant="danger" disabled={removing} onclick={onremove}>
      {removing ? 'Removing…' : 'Remove'}
    </Button>
  {/snippet}
</Modal>
