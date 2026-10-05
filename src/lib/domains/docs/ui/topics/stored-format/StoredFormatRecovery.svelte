<script lang="ts">
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import DamageDemo from './DamageDemo.svelte';
  import {
    EXPORT_FIRST_HREF,
    IDENTITY_MERGE_HREF,
    STORED_FORMAT_SECTIONS,
  } from './stored-format-sections';

  const WAYS_OUT = [
    {
      record: 'Book on the shelf',
      shown:
        'The library shows “1 book could not be read”. Opening its /read/<id> link says to upload the same file again.',
      out: 'Upload the same file again: it is restored under its id, with its captures. Or Merge into a readable book that matches, or Remove it (its captures are kept).',
    },
    {
      record: 'Removed-book record',
      shown: 'Listed under Removed books, after the readable records, as “Could not be read”.',
      out: 'Upload the same file again to restore it, or delete its captures.',
    },
    {
      record: 'Page list',
      shown: 'Opening the book fails with the reason.',
      out: 'Remove the book and upload the same file again, which writes a new list.',
    },
    {
      record: 'Capture',
      shown:
        '“1 capture could not be read” in the library’s capture search, on Tags and in the reader.',
      out: 'Export these first, which saves the raw rows to a file, then Remove.',
    },
    {
      record: 'Tag',
      shown: '“1 tag could not be read” on Tags and in the reader.',
      out: 'Export these first, then Remove.',
    },
  ] as const;
</script>

<DocsSection title={STORED_FORMAT_SECTIONS.unreadable}>
  <p>
    A strict read needs somewhere to put a row that fails. Dropping it would lose a reader’s work
    without a word, and failing the whole list would hide every good row behind one bad one. So each
    list reader splits its rows into the readable ones and the unreadable ones, and the screens show
    the second group apart, with a way out:
  </p>
  <Table size="sm" caption="Where an unreadable row shows, and the way out">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Record</TableHeaderCell>
        <TableHeaderCell>Where it shows</TableHeaderCell>
        <TableHeaderCell>Way out</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each WAYS_OUT as row (row.record)}
        <TableRow>
          <TableHeaderCell scope="row">{row.record}</TableHeaderCell>
          <TableCell>{row.shown}</TableCell>
          <TableCell>{row.out}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    Every export also keeps the unreadable rows, raw, in its <code>unreadable</code> section, so a
    later build that can read them, or a person with a text editor, still has them. The capture and
    tag notices offer that export before Remove, because removing those rows is permanent (<a
      href={EXPORT_FIRST_HREF}>Export before a permanent delete</a
    >). Merging is described on the book identity page (<a href={IDENTITY_MERGE_HREF}
      >Merging captures onto a held book</a
    >).
  </p>
  <p>
    One case has no way out in the app: a row whose id itself is unusable, empty or not text, cannot
    be listed on its own, because the list needs the id to name it. Reading that list then fails as
    a whole. A removed record with no usable id is left out of Removed books.
  </p>
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.damage}>
  <p>
    Pick one of the frozen rows the specs use, pick a field, and damage it. The result is what the
    real mapper returns, and the text says where the app would show the row.
  </p>
  <DamageDemo />
  <p>
    Some damage still reads: an alias of <code>""</code> is text, so the book holds it. Removing a field
    never reads, because no field may be absent, not even one that may be null.
  </p>
</DocsSection>
