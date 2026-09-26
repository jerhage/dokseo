<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import ArrowUpDown from '$lib/components/icons/ArrowUpDown.svelte';
  import LayoutGrid from '$lib/components/icons/LayoutGrid.svelte';
  import List from '$lib/components/icons/List.svelte';
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
    headerClass="layout-app-shell-narrow-nowrap"
    bind:selected={() => shelf, (id) => (shelf = toShelf(id))}
  >
    {#snippet tools()}
      <Dropdown size="sm" variant="ghost" align="end" class="layout-app-shell-wide-only">
        {#snippet trigger()}Sort: {sortName(order)}{/snippet}
        {@render sortChoices()}
      </Dropdown>
      <div class="row gap-1 layout-app-shell-wide-only" role="group" aria-label="Show books as">
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
      <Dropdown
        variant="ghost"
        align="end"
        square
        chevron={false}
        class="layout-app-shell-narrow-only"
      >
        {#snippet trigger()}
          <ArrowUpDown class="btn-icon" />
          <span class="visually-hidden">Sort: {sortName(order)}</span>
        {/snippet}
        {@render sortChoices()}
      </Dropdown>
      <Button
        variant="ghost"
        square
        class="layout-app-shell-narrow-only"
        aria-label={viewSwitchName(layout)}
        onclick={() => (layout = otherView(layout))}
      >
        {#if layout === 'grid'}
          <List class="btn-icon" />
        {:else}
          <LayoutGrid class="btn-icon" />
        {/if}
      </Button>
    {/snippet}
    {#snippet panel()}
      {#if shown.length === 0}
        <p class="text-sm text-muted py-4">{emptyShelfText(shelf, searching)}</p>
      {:else if layout === 'grid'}
        <BookGrid books={shown} {covers} {busy} {onedit} {onremove} {onfinish} {onunread} />
      {:else}
        <BookTable books={shown} {busy} {onedit} {onremove} {onfinish} {onunread} />
      {/if}
    {/snippet}
  </Tabs>
</section>
