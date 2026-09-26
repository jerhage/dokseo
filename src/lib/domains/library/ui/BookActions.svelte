<script lang="ts">
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import Ellipsis from '$lib/components/icons/Ellipsis.svelte';
  import type { Book } from '../domain/book/book';
  import { readingState } from './library-shelves';

  type Props = {
    readonly book: Book;
    readonly busy: boolean;
    readonly onedit: () => void;
    readonly onremove: () => void;
    readonly onfinish: () => void;
    readonly onunread: () => void;
  };

  let { book, busy, onedit, onremove, onfinish, onunread }: Props = $props();

  const reading = $derived(readingState(book));
</script>

<Dropdown size="sm" variant="ghost" align="end">
  {#snippet trigger()}
    <Ellipsis class="btn-icon" />
    <span class="visually-hidden">Actions for {book.title}</span>
  {/snippet}
  {#if reading !== 'finished'}
    <DropdownItem disabled={busy} onclick={onfinish}>Mark as finished</DropdownItem>
  {/if}
  {#if reading !== 'unread'}
    <DropdownItem disabled={busy} onclick={onunread}>Mark as unread</DropdownItem>
  {/if}
  <DropdownItem disabled={busy} onclick={onedit}>Book settings…</DropdownItem>
  <DropdownItem danger disabled={busy} onclick={onremove}>Remove…</DropdownItem>
</Dropdown>
