<script lang="ts">
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import type { Book } from '../domain/book/book';

  type Props = {
    readonly book: Book;
    readonly busy: boolean;
    readonly onedit: () => void;
    readonly onremove: () => void;
  };

  let { book, busy, onedit, onremove }: Props = $props();
</script>

<Dropdown size="sm" variant="ghost" align="end">
  {#snippet trigger()}
    <span aria-hidden="true">⋯</span>
    <span class="visually-hidden">Actions for {book.title}</span>
  {/snippet}
  <DropdownItem disabled={busy} onclick={onedit}>Book settings…</DropdownItem>
  <DropdownItem danger disabled={busy} onclick={onremove}>Remove…</DropdownItem>
</Dropdown>
