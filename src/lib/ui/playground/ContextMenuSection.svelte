<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import { createContextMenuAreas } from '../components/context-menu-areas';
  import ContextMenu from '../components/ContextMenu.svelte';
  import DropdownItem from '../components/DropdownItem.svelte';
  import DropdownSeparator from '../components/DropdownSeparator.svelte';
  import Table from '../components/Table.svelte';
  import TableBody from '../components/TableBody.svelte';
  import TableCell from '../components/TableCell.svelte';
  import TableHeader from '../components/TableHeader.svelte';
  import TableHeaderCell from '../components/TableHeaderCell.svelte';
  import TableRow from '../components/TableRow.svelte';
  import DemoSection from './DemoSection.svelte';

  type ShelfBook = { readonly title: string; readonly pages: number; readonly read: boolean };

  const SHELF: readonly ShelfBook[] = [
    { title: 'Moby Dick', pages: 635, read: true },
    { title: 'Middlemarch', pages: 880, read: false },
    { title: 'The Waves', pages: 297, read: false },
  ];

  const rows = createContextMenuAreas<ShelfBook>();

  let chosen = $state('nothing yet');
  let rowChosen = $state('nothing yet');
</script>

<DemoSection id="context-menu" title="Context menu" classes={['context-menu', 'dropdown-menu']}>
  <Card>
    <p class="text-sm text-muted">
      A menu over an area. A secondary click opens it at the pointer; Shift+F10 or the ContextMenu
      key opens it at the focused element. Escape or a click outside closes it.
    </p>
    <ContextMenu label="Card actions">
      <Button block>Right-click here, or focus this button and press Shift+F10</Button>
      {#snippet menu()}
        <DropdownItem onclick={() => (chosen = 'Open')}>Open</DropdownItem>
        <DropdownItem hint="F2" onclick={() => (chosen = 'Rename')}>Rename</DropdownItem>
        <DropdownItem disabled>Move to…</DropdownItem>
        <DropdownSeparator />
        <DropdownItem danger onclick={() => (chosen = 'Delete')}>Delete</DropdownItem>
      {/snippet}
    </ContextMenu>
    <p class="text-xs text-muted">Chosen: {chosen}</p>
  </Card>
  <Card>
    <p class="text-sm text-muted">
      Attached to table rows: each row is an area, with no wrapper, and one menu after the table
      serves them all. Its items follow the row it opened on.
    </p>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Title</TableHeaderCell>
          <TableHeaderCell numeric>Pages</TableHeaderCell>
          <TableHeaderCell actions>Actions</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each SHELF as book (book.title)}
          <TableRow {@attach rows.area(book)}>
            <TableCell>{book.title}</TableCell>
            <TableCell numeric>{book.pages}</TableCell>
            <TableCell actions>
              <Button size="sm" onclick={() => (rowChosen = `Open ${book.title}`)}>Open</Button>
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
    <ContextMenu areas={rows} label={(book) => `${book.title} actions`}>
      {#snippet menu(book)}
        <DropdownItem onclick={() => (rowChosen = `Open ${book.title}`)}>Open</DropdownItem>
        <DropdownItem disabled={book.read} onclick={() => (rowChosen = `Mark ${book.title} read`)}>
          Mark as read
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem danger onclick={() => (rowChosen = `Delete ${book.title}`)}
          >Delete</DropdownItem
        >
      {/snippet}
    </ContextMenu>
    <p class="text-xs text-muted">Chosen: {rowChosen}</p>
  </Card>
</DemoSection>
