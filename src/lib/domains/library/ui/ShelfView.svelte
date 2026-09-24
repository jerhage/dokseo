<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { Book } from '../domain/book/book';
  import BookGrid from './BookGrid.svelte';
  import BookTable from './BookTable.svelte';
  import { SORT_ORDERS, emptyShelfText, shelfTabs, sortName, toShelf } from './library-shelves';
  import type { CollectionView, Shelf, SortOrder } from './library-shelves';

  type Props = {
    readonly books: readonly Book[];
    readonly shown: readonly Book[];
    readonly covers: ReadonlyMap<BookId, string>;
    readonly searching: boolean;
    readonly busy: (id: BookId) => boolean;
    readonly onedit: (id: BookId) => void;
    readonly onremove: (id: BookId) => void;
    shelf?: Shelf;
    order?: SortOrder;
    layout?: CollectionView;
  };

  let {
    books,
    shown,
    covers,
    searching,
    busy,
    onedit,
    onremove,
    shelf = $bindable('all'),
    order = $bindable('added'),
    layout = $bindable('grid'),
  }: Props = $props();

  const tabs = $derived(shelfTabs(books));
</script>

<section aria-label="Your books">
  <Tabs
    {tabs}
    label="Shelves"
    variant="pill"
    bind:selected={() => shelf, (id) => (shelf = toShelf(id))}
  >
    {#snippet tools()}
      <Dropdown size="sm" variant="ghost" align="end">
        {#snippet trigger()}Sort: {sortName(order)}{/snippet}
        {#each SORT_ORDERS as choice (choice)}
          <DropdownItem selected={order === choice} onclick={() => (order = choice)}>
            {sortName(choice)}
          </DropdownItem>
        {/each}
      </Dropdown>
      <div class="row gap-1" role="group" aria-label="Show books as">
        <Button
          size="sm"
          variant="ghost"
          active={layout === 'grid'}
          aria-pressed={layout === 'grid'}
          onclick={() => (layout = 'grid')}
        >
          Covers
        </Button>
        <Button
          size="sm"
          variant="ghost"
          active={layout === 'list'}
          aria-pressed={layout === 'list'}
          onclick={() => (layout = 'list')}
        >
          List
        </Button>
      </div>
    {/snippet}
    {#snippet panel()}
      {#if shown.length === 0}
        <p class="text-sm text-muted py-4">{emptyShelfText(shelf, searching)}</p>
      {:else if layout === 'grid'}
        <BookGrid books={shown} {covers} {busy} {onedit} {onremove} />
      {:else}
        <BookTable books={shown} {busy} {onedit} {onremove} />
      {/if}
    {/snippet}
  </Tabs>
</section>
