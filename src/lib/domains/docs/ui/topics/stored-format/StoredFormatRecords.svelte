<script lang="ts">
  import { match } from 'ts-pattern';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { fieldRows, ownFieldRows, recordFormat } from './field-notes';
  import FieldTable from './FieldTable.svelte';
  import { STORE_ROWS } from './stored-layout';
  import type { Coverage } from './stored-layout';
  import {
    IDENTITY_LADDER_HREF,
    IDENTITY_PARTIAL_HREF,
    INDEXEDDB_INDEXES_HREF,
    INDEXEDDB_UPGRADES_HREF,
    STORED_FORMAT_SECTIONS,
  } from './stored-format-sections';
  import {
    BLOB_KEYS,
    CORRUPT_ROW_MESSAGE,
    FIELD_CHECKS,
    FITS_ON_PAGE,
    FOREIGN_FIELD,
    PLACE_FITS_LAYOUT,
  } from './stored-format-snippets';

  const book = recordFormat('book');
  const removed = recordFormat('removed-book');

  function coverageText(coverage: Coverage): string {
    return match(coverage)
      .with('rows', () => 'Store and rows')
      .with('store only', () => 'Store only; rows fall back')
      .with('outside', () => 'Outside')
      .exhaustive();
  }
</script>

<DocsSection title={STORED_FORMAT_SECTIONS.databases}>
  <p>
    Dokseo opens three IndexedDB databases, each owned by one part of the app. The table below is
    built from the same literals the pinning specs compare against the real <code>upgrade</code>
    functions, so it lists exactly the stores and indexes a 1.x build creates. The layout is part of the
    format: a new store or a new index is a version change, as the <code>tagIds</code> index was
    when <code>recognition</code> went to version 5 (<a href={INDEXEDDB_INDEXES_HREF}>Indexes</a>,
    <a href={INDEXEDDB_UPGRADES_HREF}>Version upgrades</a>).
  </p>
  <Table size="sm" caption="The 1.x databases">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Database</TableHeaderCell>
        <TableHeaderCell>Store</TableHeaderCell>
        <TableHeaderCell>Key path</TableHeaderCell>
        <TableHeaderCell>Indexes</TableHeaderCell>
        <TableHeaderCell>In the promise</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each STORE_ROWS as row (`${row.database}/${row.store}`)}
        <TableRow>
          <TableCell><code>{row.database}</code> v{row.version}</TableCell>
          <TableCell><code>{row.store}</code></TableCell>
          <TableCell><code>{row.keyPath}</code></TableCell>
          <TableCell>{row.indexes.length === 0 ? 'None' : row.indexes.join('; ')}</TableCell>
          <TableCell>{coverageText(row.coverage)}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.checks}>
  <p>
    Each record kind has one mapper that turns a stored row into the type the app uses. It checks
    every field with a small set of shared checks. A number must be finite, so <code>NaN</code> and
    <code>Infinity</code>, which a structured clone can hold, fail. A count or an index must be a
    whole number, and a fraction must lie between 0 and 1: a value outside is rejected, never
    clamped, because clamping would hide how it got there.
  </p>
  <DocsCode label={FIELD_CHECKS.file} code={FIELD_CHECKS.code} />
  <p>
    A failed check throws a <code>CorruptRow</code> error whose message names the record and the field.
    That message is what the demo below shows, and what an unreadable row reports:
  </p>
  <DocsCode label={CORRUPT_ROW_MESSAGE.file} code={CORRUPT_ROW_MESSAGE.code} />
  <p>
    Times are milliseconds since the Unix epoch, as <code>Date.now()</code> gives them. Every field
    must be present: a field that may be empty is <code>null</code>, never absent. The tables in the
    next sections are rendered from the frozen fixtures, and a test fails if a fixture gains a field
    that no row here describes, or a value whose type the row does not list.
  </p>
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.books}>
  <p>
    A book row is the record of one uploaded file, in the <code>books</code> store of
    <code>reader</code>. It holds the identity used to recognize the same file again (<a
      href={IDENTITY_PARTIAL_HREF}>KOReader’s partial MD5</a
    >), the reader’s choices for the book, and the reading place.
  </p>
  <FieldTable rows={fieldRows(book)} caption="Book row fields" />
  <p>
    The <code>position</code> field holds one of two places. Paged and continuous books keep an image
    place, flow books (EPUB text) a text place, and a row whose place does not fit its layout is unreadable:
  </p>
  <DocsCode label={PLACE_FITS_LAYOUT.file} code={PLACE_FITS_LAYOUT.code} />
  <p>
    A key that no field names is ignored by the read, and the next save of the book writes the
    mapped book without it.
  </p>
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.pageLists}>
  <p>
    A ZIP archive or a folder of images has no fixed page order of its own, so Dokseo stores the
    order it chose, in <code>page-lists</code>. PDF and EPUB books have none. The list is written
    when the book is added, or on the first open if it is missing.
  </p>
  <FieldTable rows={fieldRows(recordFormat('page-list'))} caption="Page list fields" />
  <p>
    Captures name a page by its image index, its place in this list. So a list that fails its checks
    is not rebuilt from the archive: a new list in a different order would move captures to other
    pages. Opening the book fails with the cause instead.
  </p>
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.removed}>
  <p>
    Removing a book deletes its file but keeps a record in <code>removed-books</code>, so its
    captures keep their book and an upload of the same file can restore it. The record is the whole
    book row plus one field:
  </p>
  <FieldTable
    rows={ownFieldRows(removed, book)}
    caption="Removed-book record fields, beyond the book row"
  />
  <p>
    Every book field is read with the book rules above. Removing a book whose row is already
    unreadable stores that raw row plus <code>removedAt</code>, so nothing it held is lost. A
    restore keeps the id, alias, series id and volume, and takes every other field fresh from the
    upload (<a href={IDENTITY_LADDER_HREF}>The matching ladder</a>).
  </p>
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.captures}>
  <p>
    A capture row holds a piece of text and where it came from: a region anchor with boxes on page
    images, or a text anchor with an EPUB CFI and a quote. Its <code>origin</code> says how it was made.
  </p>
  <FieldTable rows={fieldRows(recordFormat('capture'))} caption="Capture row fields" />
  <p>
    A region box is stored as fractions of its page image, and a box that does not fit on the page
    makes the row unreadable. The write side clamps a box onto the page before it stores it, so a
    rounding overshoot never produces a row the read refuses:
  </p>
  <DocsCode label={FITS_ON_PAGE.file} code={FITS_ON_PAGE.code} />
  <p>
    <code>note</code> and <code>confidence</code> depend on the origin. A written capture has neither,
    a lifted one has a note, and a recognized one has both. Unlike other unknown keys, one of these two
    on the wrong origin makes the row unreadable, because it means the origin and the fields disagree:
  </p>
  <DocsCode label={FOREIGN_FIELD.file} code={FOREIGN_FIELD.code} />
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.tags}>
  <p>
    A tag row names a tag and its color. Captures refer to tags by id, through the
    <code>tagIds</code> index.
  </p>
  <FieldTable rows={fieldRows(recordFormat('tag'))} caption="Tag row fields" />
  <p>
    A color outside the sixteen tag colors makes the row unreadable instead of falling back to the
    first color, so a tag never changes color because a build did not know its value.
  </p>
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.files}>
  <p>
    The book files themselves live in the origin private file system, in a directory named
    <code>blobs</code>. Each book has the uploaded file and, when one was found, a cover image, both
    named from the book id:
  </p>
  <DocsCode label={BLOB_KEYS.file} code={BLOB_KEYS.code} />
  <p>
    These names are part of the promise because the book row does not store them: a build finds a
    book’s file only by building the name from its id. The book id therefore cannot change within
    1.x, and stays a random UUID local to the device.
  </p>
</DocsSection>
