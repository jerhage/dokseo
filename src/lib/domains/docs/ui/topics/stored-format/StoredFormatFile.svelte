<script lang="ts">
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { GOLDEN_TEXT, goldenCounts, goldenPart } from './stored-layout';
  import {
    EXPORT_FORMAT_HREF,
    EXPORT_STRICT_HREF,
    STORED_FORMAT_SECTIONS,
    TESTING_DRIFT_HREF,
  } from './stored-format-sections';

  const FILE_FIELDS = [
    {
      field: 'format',
      type: 'string',
      meaning: 'Always "dokseo-captures". Anything else is not an export.',
    },
    {
      field: 'version',
      type: 'number',
      meaning:
        'Always 1. A whole number above 1 is reported as a newer version; anything else is not an export.',
    },
    { field: 'exportedAt', type: 'number', meaning: 'When the file was written, in ms.' },
    { field: 'appVersion', type: 'string', meaning: 'The version of the build that wrote it.' },
    {
      field: 'books',
      type: 'list',
      meaning:
        'One entry per book a capture names: its identity, keyed book-1, book-2 and so on. No local id and no reading place.',
    },
    { field: 'tags', type: 'list', meaning: 'Tag rows, exactly as they are stored.' },
    {
      field: 'captures',
      type: 'list',
      meaning: 'Capture rows without bookId, each with a bookKey naming one of the books.',
    },
    {
      field: 'unreadable',
      type: 'object, optional',
      meaning:
        'Stored rows that could not be read, kept raw in books, tags and captures lists. Written only when there are any; never imported.',
    },
  ] as const;

  const counts = goldenCounts(GOLDEN_TEXT);
</script>

<DocsSection title={STORED_FORMAT_SECTIONS.file}>
  <p>
    Export writes captures, their tags and the identity of their books to a JSON file, and import
    reads it on the same device or another one (<a href={EXPORT_FORMAT_HREF}
      >The dokseo-captures format</a
    >). The file outlives any database, so its version 1 is part of the promise on its own terms:
    every 1.x build reads every v1 file.
  </p>
  <Table size="sm" caption="The captures file, version 1">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Field</TableHeaderCell>
        <TableHeaderCell>Type</TableHeaderCell>
        <TableHeaderCell>Meaning</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each FILE_FIELDS as row (row.field)}
        <TableRow>
          <TableCell><code>{row.field}</code></TableCell>
          <TableCell><code>{row.type}</code></TableCell>
          <TableCell>{row.meaning}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The entries reuse the row rules. Tags and captures go through the same mappers as stored rows,
    and a book entry holds the identity fields of a book row with the same checks: a partial MD5, a
    source kind that fits the layout, a whole-number image count. <code>seriesId</code> and
    <code>volume</code> may be absent from a book entry and then read as null. The first book entry and
    the first capture entry of the golden file below:
  </p>
  <DocsCode label="captures-v1.golden.json, books[0]" code={goldenPart('books')} />
  <DocsCode label="captures-v1.golden.json, captures[0]" code={goldenPart('captures')} />
  <p>
    A file is read entry by entry. A broken entry is skipped with its reason and the rest import (<a
      href={EXPORT_STRICT_HREF}>Reading strictly, entry by entry</a
    >). Only a missing or mistyped top-level field refuses the whole file.
  </p>
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.golden}>
  <p>
    A <em>golden file</em> is a checked-in output that a test compares against, byte for byte.
    Dokseo keeps one for the captures file, <code>captures-v1.golden.json</code>, built from the
    same fixtures as the field tables above. Two tests hold it (<a href={TESTING_DRIFT_HREF}
      >Drift tests</a
    >):
  </p>
  <ul class="prose">
    <li>
      The real reader turns it into exactly the books, tags and captures it was built from, and
      counts its unreadable rows.
    </li>
    <li>
      The real builder, given the same holdings, writes a file equal to it and byte-identical to its
      compact form.
    </li>
  </ul>
  <p>
    The first test is the promise to old files: a v1 file written today must import in every later
    1.x build. The second catches a change to what this build writes. This page reads the file with
    the real <code>readCapturesFile</code> as it renders:
  </p>
  <Table size="sm" caption="The golden file, read by readCapturesFile in this page">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Section</TableHeaderCell>
        <TableHeaderCell>Entries in the file</TableHeaderCell>
        <TableHeaderCell>Read</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each counts as row (row.section)}
        <TableRow>
          <TableCell><code>{row.section}</code></TableCell>
          <TableCell>{row.inFile}</TableCell>
          <TableCell>{row.read}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The <code>unreadable</code> section holds three pre-release rows: a book with an old SHA-256 hash,
    a tag with a color no build knows, and a capture with its box in pixels. The reader counts them and
    imports none:
  </p>
  <DocsCode label="captures-v1.golden.json, unreadable" code={goldenPart('unreadable')} />
</DocsSection>
