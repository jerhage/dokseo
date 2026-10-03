<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import { BookCapturesExport } from '$lib/shared/book-captures-export.svelte';
  import type { BookCapturesExporting } from '$lib/shared/book-captures-export.svelte';
  import BookCapturesExportButton from '$lib/shared/BookCapturesExportButton.svelte';
  import { shownTitle } from '$lib/shared/shown-title';
  import type { Book } from '../domain/book/book';
  import {
    DEFAULT_REMOVAL,
    DELETE_CAPTURES_CHOICE,
    removalChosen,
    removalNote,
  } from './removed-books';
  import type { BookRemoval } from './removed-books';

  type Props = {
    readonly book: Book;
    readonly removing: boolean;
    readonly exporting: BookCapturesExporting;
    readonly onremove: (removal: BookRemoval) => void;
    readonly onclose: () => void;
  };

  let { book, removing, exporting, onremove, onclose }: Props = $props();

  let open = $state(true);
  let removal = $state<BookRemoval>(DEFAULT_REMOVAL);
  const capturesExport = new BookCapturesExport({
    exportBookCaptures: (id) => exporting.exportBookCaptures(id),
  });

  function chooseRemoval(next: boolean): void {
    removal = removalChosen(next);
    if (removal === 'delete-captures') void capturesExport.ensurePrepared(book.id);
  }

  function requestOpen(next: boolean): void {
    if (removing) return;
    open = next;
  }
</script>

<Modal bind:open={() => open, requestOpen} title="Remove this upload?" size="sm" {onclose}>
  <p class="text-sm">
    <strong lang={book.language}>{shownTitle(book)}</strong> will be removed from your library.
    {removalNote(removal)}
  </p>

  <Checkbox bind:checked={() => removal === 'delete-captures', chooseRemoval} disabled={removing}>
    {DELETE_CAPTURES_CHOICE}
  </Checkbox>

  {#if removal === 'delete-captures'}
    <BookCapturesExportButton view={capturesExport} />
  {/if}

  {#snippet footer(close)}
    <Button disabled={removing} onclick={close}>Cancel</Button>
    <Button variant="danger" disabled={removing} onclick={() => onremove(removal)}>
      {removing ? 'Removing…' : 'Remove'}
    </Button>
  {/snippet}
</Modal>
