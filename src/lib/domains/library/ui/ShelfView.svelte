<script lang="ts">
  import IconButton from '$lib/components/IconButton.svelte';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ArrowUpDown from '$lib/components/icons/ArrowUpDown.svelte';
  import LayoutGrid from '$lib/components/icons/LayoutGrid.svelte';
  import List from '$lib/components/icons/List.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import type { SegmentOption } from '$lib/components/segmented-control';
  import Tabs from '$lib/components/Tabs.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { Book } from '../domain/book/book';
  import BookGrid from './BookGrid.svelte';
  import BookTable from './BookTable.svelte';
  import {
    SORT_ORDERS,
    emptyShelfText,
    otherView,
    shelfTabs,
    sortName,
    toShelf,
    viewSwitchName,
  } from './library-shelves';
  import type { CollectionView, Shelf, SortOrder } from './library-shelves';

  type Props = {
    readonly books: readonly Book[];
    readonly shown: readonly Book[];
    readonly covers: ReadonlyMap<BookId, string>;
    readonly searching: boolean;
    readonly busy: (id: BookId) => boolean;
    readonly onedit: (id: BookId) => void;
    readonly onremove: (id: BookId) => void;
    readonly onfinish: (id: BookId) => void;
    readonly onunread: (id: BookId) => void;
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
    onfinish,
    onunread,
    shelf = $bindable('all'),
    order = $bindable('added'),
    layout = $bindable('grid'),
  }: Props = $props();

  const tabs = $derived(shelfTabs(books));

  const views: readonly SegmentOption<CollectionView>[] = [
    { value: 'grid', label: 'Covers' },
    { value: 'list', label: 'List' },
  ];
</script>

{#snippet sortChoices()}
  {#each SORT_ORDERS as choice (choice)}
    <DropdownItem selected={order === choice} onclick={() => (order = choice)}>
      {sortName(choice)}
    </DropdownItem>
  {/each}
{/snippet}

<section aria-label="Your books">
  <Tabs
    {tabs}
    label="Shelves"
    variant="pill"
    class="layout-app-shell-narrow-nowrap"
    bind:selected={() => shelf, (id) => (shelf = toShelf(id))}
  >
    {#snippet actions()}
      <Dropdown size="sm" variant="ghost" align="end" class="layout-app-shell-wide-only">
        {#snippet trigger()}Sort: {sortName(order)}{/snippet}
        {@render sortChoices()}
      </Dropdown>
      <SegmentedControl
        variant="ghost"
        label="Show books as"
        class="row gap-1 layout-app-shell-wide-only"
        options={views}
        bind:value={layout}
      />
      <Dropdown
        variant="ghost"
        align="end"
        square
        chevron={false}
        class="layout-app-shell-narrow-only"
        icon={ArrowUpDown}
        label="Sort: {sortName(order)}"
      >
        {@render sortChoices()}
      </Dropdown>
      <IconButton
        variant="ghost"
        class="layout-app-shell-narrow-only"
        icon={layout === 'grid' ? List : LayoutGrid}
        label={viewSwitchName(layout)}
        tooltip={false}
        onclick={() => (layout = otherView(layout))}
      />
    {/snippet}
    {#snippet panel()}
      {#if shown.length === 0}
        <EmptyState class="py-4" message={emptyShelfText(shelf, searching)} />
      {:else if layout === 'grid'}
        <BookGrid books={shown} {covers} {busy} {onedit} {onremove} {onfinish} {onunread} />
      {:else}
        <BookTable books={shown} {busy} {onedit} {onremove} {onfinish} {onunread} />
      {/if}
    {/snippet}
  </Tabs>
</section>
