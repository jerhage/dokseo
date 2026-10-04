<script lang="ts">
  import type { Snippet } from 'svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { EXPORT_IMPORT_SECTIONS } from './export-import-sections';
  import {
    BOOK_MATCH,
    CAPTURES_FILE_TYPE,
    FILE_CAPTURE,
    PLAN_TAGS,
    READ_FILE,
  } from './export-import-snippets';

  type Props = { builder: Snippet; reader: Snippet };

  let { builder, reader }: Props = $props();

  const BOOK_FIELDS = [
    {
      field: 'key',
      holds: 'book-1, book-2 and so on, in title order. Only means something in the file.',
    },
    { field: 'contentHash', holds: 'The partial MD5 of the book file.' },
    { field: 'fileName', holds: 'The name of the file that was added.' },
    { field: 'title, alias', holds: 'The title, and the name the reader gave it, if any.' },
    {
      field: 'language, direction',
      holds: 'What the captures are written in, and how pages turn.',
    },
    {
      field: 'layoutKind, sourceKind, imageCount',
      holds: 'Paged or continuous, the kind of file, the page count. null for a removed book.',
    },
  ] as const;

  const READ_OUTCOMES = [
    { reason: 'invalid', when: 'A field is missing or holds a value outside the known set.' },
    { reason: 'repeated', when: 'A book key, tag id or capture id already appeared earlier.' },
    {
      reason: 'unknown-book',
      when: 'A capture names a book key the file does not hold, or holds as unreadable.',
    },
  ] as const;
</script>

<DocsSection title={EXPORT_IMPORT_SECTIONS.format}>
  <p>
    Settings › Your data › Export all captures writes one JSON file, named
    <code>dokseo-captures-YYYY-MM-DD.json</code> after the device's local date. It holds the captures,
    the tags, and an identity entry for every book a capture belongs to, removed books included. It does
    not hold the book files, reading positions, reading settings or device preferences, so each device
    needs its own copy of a book.
  </p>
  <DocsCode label={CAPTURES_FILE_TYPE.label} code={CAPTURES_FILE_TYPE.code} />
  <p>
    <code>format</code> is always <code>'dokseo-captures'</code> and <code>version</code> is
    <code>1</code>. <code>appVersion</code> records the build that wrote the file; reading only checks
    that it is text. Each book entry swaps the device's id for a key:
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Book field</TableHeaderCell>
        <TableHeaderCell>Holds</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each BOOK_FIELDS as row (row.field)}
        <TableRow>
          <TableCell><code>{row.field}</code></TableCell>
          <TableCell>{row.holds}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    A tag entry is the stored tag as it is: id, name, color and creation time. A capture entry is
    the stored capture with <code>bookId</code> replaced by <code>bookKey</code>; its own id, its
    tag ids, its anchor on the page, its text, note and times are copied unchanged. For the same
    book file the anchor means the same place on every device, because it names an image index and a
    rectangle, or for an EPUB a CFI location and a quote of the text.
  </p>
  <p>
    A few rules govern what gets in. Only books with at least one capture are written. A removed
    book, of which Dokseo keeps only a record, writes <code>null</code> for the three fields the record
    does not keep. A capture whose book is in neither the shelf nor the removed records is left out, and
    the export reports it: "1 capture belongs to no book and was left out." Books are sorted by title
    then device id, tags and captures by creation time then id, so the same holdings always give the same
    text, and two exports can be compared with a diff.
  </p>
  <DocsDemo label="Build a captures file" resettable>
    {@render builder()}
    {#snippet caption()}
      Sample holdings in memory, written by the real <code>buildCapturesFile</code>. Edit a capture,
      toggle a tag, remove a book or add a capture with no book, and watch the file change. The real
      file is written without indentation.
    {/snippet}
  </DocsDemo>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.reading}>
  <p>
    <code>readCapturesFile</code> takes the file's text and returns one of three outcomes:
    <code>read</code>, <code>not-an-export</code> or <code>newer-version</code>. Text that is not
    JSON, a missing or different <code>format</code>, a <code>version</code> that is not a whole
    number above zero, and a file missing <code>exportedAt</code>, <code>appVersion</code> or one of
    the three lists are all <code>not-an-export</code>. A whole number above 1 is
    <code>newer-version</code>, and the import screen says to update the app instead.
  </p>
  <DocsCode label={READ_FILE.label} code={READ_FILE.code} />
  <p>
    Every entry is then read on its own. A capture or tag goes through the same functions that read
    rows from Dokseo's own database, <code>captureFromStored</code> and
    <code>tagFromStored</code>, but two checks run first. Reading the database falls back when it
    meets an unknown <code>origin</code> (it reads the capture as recognized) or an unknown tag
    color (it uses the first color). The file reader rejects both, for the reason in
    <a href="#reading-strictly-entry-by-entry">reading strictly</a>.
  </p>
  <DocsCode label={FILE_CAPTURE.label} code={FILE_CAPTURE.code} />
  <p>
    A book entry with any bad field is rejected whole, with no fallback for its language or
    direction, and its captures are skipped as <code>unknown-book</code>. A tag id that a capture
    names but the file does not hold is taken off that capture and reported separately, and the
    capture keeps its other tags. Two fields stay lenient: a capture with no <code>note</code> or no
    <code>confidence</code> reads as <code>null</code> instead of being rejected.
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Reason</TableHeaderCell>
        <TableHeaderCell>When an entry is skipped</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each READ_OUTCOMES as row (row.reason)}
        <TableRow>
          <TableCell><code>{row.reason}</code></TableCell>
          <TableCell>{row.when}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <DocsDemo label="Break a captures file" resettable>
    {@render reader()}
    {#snippet caption()}
      The text goes through the real <code>readCapturesFile</code>, and the sentences under it come
      from the import screen's real wording. Break the whole file, break single entries, or edit the
      text by hand.
    {/snippet}
  </DocsDemo>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.books}>
  <p>
    Each book in the file has to become a book on this device. The import uses the matching the
    library already uses when a removed book is uploaded again, which
    <a href="/docs/book-identity">Book identity and recovery</a> explains: content hash first, then file
    name, then title. The shelf is searched first, then the records of removed books and the rows that
    could not be read.
  </p>
  <DocsCode label={BOOK_MATCH.label} code={BOOK_MATCH.code} />
  <p>
    The hash alone is not enough, because the same book does not always have the same hash: an older
    row can hold a hash computed another way, and a file name can be empty. Within one list, every
    candidate is tried at a step before the next step starts, so a hash match beats a file name
    match; and any match on the shelf, even by title, wins over the removed records. A title match
    skips empty titles and "Untitled book". The cost is accepted: two different books with the same
    title, and no matching hash or file name, match each other.
  </p>
  <p>
    A book that matches nothing is absent. The import does not invent a shelf book for it, since
    there is no file to read. It writes a removed-book record instead, with a new local id and the
    file's identity, and the captures wait there. Uploading the book later restores it, and the
    captures reattach, the same way they do after a book was removed.
  </p>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.tags}>
  <p>
    Tag ids are global once copied, but two devices that each created a tag called "vocab" hold two
    ids for one name. So tags merge by name. <code>sameTagName</code> compares names after trimming, Unicode
    NFC, collapsing inner spaces, and the folding search uses: case, character width, and katakana against
    hiragana. "vocab" on the phone and "Vocab" on the laptop are one tag.
  </p>
  <DocsCode label={PLAN_TAGS.label} code={PLAN_TAGS.code} />
  <p>
    A file tag whose name matches a tag here maps onto it, and the tag here keeps its color. A new
    name is created with the file's id, color and creation time, unless a tag here, readable or not,
    already holds that id, in which case it gets a new one. Two file tags that differ only in case
    become one. Every capture's tag ids are then mapped through this table.
  </p>
</DocsSection>
