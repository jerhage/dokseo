<script lang="ts">
  import Dropdown from '$lib/ui/components/Dropdown.svelte';
  import Ellipsis from '$lib/ui/components/icons/Ellipsis.svelte';
  import { shownTitle } from '$lib/shared/shown-title';
  import type { Book } from '../domain/book/book';
  import BookActionItems from './BookActionItems.svelte';

  type Props = {
    readonly book: Book;
    readonly busy: boolean;
    readonly onedit: () => void;
    readonly onremove: () => void;
    readonly onfinish: () => void;
    readonly onunread: () => void;
  };

  let { book, busy, onedit, onremove, onfinish, onunread }: Props = $props();
</script>

<Dropdown
  size="sm"
  variant="ghost"
  align="end"
  icon={Ellipsis}
  label="Actions for {shownTitle(book)}"
>
  <BookActionItems {book} {busy} {onedit} {onremove} {onfinish} {onunread} />
</Dropdown>
