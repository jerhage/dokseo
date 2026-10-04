<script lang="ts">
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import CapturesFileBuilder from './CapturesFileBuilder.svelte';
  import CapturesFileReader from './CapturesFileReader.svelte';
  import { EXPORT_IMPORT_SECTIONS } from './export-import-sections';
  import {
    BOOK_MATCH,
    CAPTURES_FILE_TYPE,
    FILE_CAPTURE,
    PLAN_TAGS,
    READ_FILE,
  } from './export-import-snippets';

  const BOOK_FIELDS = [
    {
      field: 'key',
      holds: 'book-1, book-2 and so on, in title order. Only means something in the file.',
    },
    {
      field: 'contentHash',
      holds: 'The partial MD5 of the book file: 32 lowercase hexadecimal characters.',
    },
    { field: 'fileName', holds: 'The name of the file that was added.' },
    { field: 'title, alias', holds: 'The title, and the name the reader gave it, if any.' },
    {
      field: 'seriesId, volume',
      holds:
        'Reserved for series, null for every book today. Required: an entry without them is skipped.',
    },
    {
      field: 'language, direction',
      holds: 'What the captures are written in, and how pages turn.',
    },
    {
      field: 'layoutKind, sourceKind, imageCount',
      holds:
        'paged, continuous or flow; images, pdf, archive or epub; the page count, a whole number. A flow book comes from an EPUB.',
    },
  ] as const;

  const READ_OUTCOMES = [
    {
      reason: 'invalid',
      when: 'A field is missing, holds a value outside the known set, or breaks a rule such as a rect inside the page.',
    },
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
    rectangle, or for an EPUB a CFI location and a quote of the text. The rectangle is stored as
    fractions of the page image, from 0 to 1, not as pixels: a pixel rectangle would depend on the
    size the page was decoded or, for a PDF, rendered at, and a fraction of the page does not.
  </p>
  <p>
    A few rules govern what gets in. Only books with at least one capture are written. When a book
    is removed, Dokseo keeps its whole book row as a removed record, with the time of removal, so a
    removed book's entry is as complete as a shelf book's. A capture whose book is in neither the
    shelf nor the removed records is left out, and the export reports it: "1 capture belongs to no
    book and was left out." Books are sorted by title then device id, tags and captures by creation
    time then id, so the same holdings always give the same text, and two exports can be compared
    with a diff.
  </p>
  <p>
    Export all captures writes every capture that can be read, including one whose book row could
    not be read, on the shelf or among the removed records. That book's entry copies the identity
    fields its row stores, as they are. When those fields pass the checks below, the entry imports
    like any other. When they do not, for example a content hash in an old format, the reader
    rejects the entry and skips its captures, but the file still holds them.
  </p>
  <p>
    Rows that could not be read at all go in a section of their own, <code>unreadable</code>, with
    three lists: <code>books</code>, <code>tags</code> and <code>captures</code>. Every capture and
    tag row that failed its read is copied in as it was stored, sorted by id. A book row that failed
    its read goes in only when a capture names its id, and a removed record whose book is back on
    the shelf is left out. The section is written only when it holds a row, so the file of a library
    with nothing unreadable has no <code>unreadable</code> field at all. After the export, Your data says,
    for example, "2 stored rows that could not be read are kept in the file as they were stored. Import
    does not bring them back."
  </p>
  <p>
    A stored row is whatever IndexedDB was given, and the structured clone algorithm keeps values
    that JSON cannot: <code>JSON.stringify</code> writes <code>NaN</code> as <code>null</code>, a
    <code>Map</code> as <code>{'{}'}</code>, and throws on a <code>BigInt</code> or a cycle. So each
    row first goes through <code>jsonSafe</code>, which writes every value in a form JSON keeps:
    <code>NaN</code>, an infinity and an invalid date become <code>null</code>; a date becomes its
    ISO text and a <code>BigInt</code> its decimal text; a <code>Map</code> becomes a list of key
    and value pairs, a <code>Set</code> a list, and binary data a list of bytes; a cycle becomes
    <code>null</code>. <code>undefined</code>, a function and a symbol are dropped, or become
    <code>null</code> inside a list.
  </p>
  <DocsDemo label="Build a captures file" resettable>
    <CapturesFileBuilder />
    {#snippet caption()}
      Sample holdings in memory, written by the real <code>buildCapturesFile</code>. Edit a capture,
      toggle a tag, remove a book, add a capture with no book, or add a stored row that the real
      <code>capturesFromStored</code> could not read, and watch the file change. The real file is written
      without indentation.
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
    <code>tagFromStored</code>, so a file entry and a stored row follow one set of rules, with no
    fallback in either, for the reason in
    <a href="#reading-strictly-entry-by-entry">reading strictly</a>. An unknown
    <code>origin</code> or an unknown tag color rejects the entry. A field the reader does not name,
    such as <code>bookKey</code> once it has been read, is not checked.
  </p>
  <DocsCode label={FILE_CAPTURE.label} code={FILE_CAPTURE.code} />
  <p>
    Which fields a capture must have depends on its origin. A recognized capture has a
    <code>note</code> and a <code>confidence</code>, and a capture lifted from an EPUB's own text
    has a <code>note</code>; either may be <code>null</code>, but neither may be missing. A capture
    typed by hand has neither, and a <code>note</code> or <code>confidence</code> on an origin without
    it rejects the entry. Each region's rect has to fit on its page: finite, x and y at least 0, width
    and height above 0, and x plus width, y plus height, at most 1.
  </p>
  <p>
    A book entry with any bad field is rejected whole, and its captures are skipped as
    <code>unknown-book</code>. It needs a <code>layoutKind</code> and a <code>sourceKind</code>, a
    whole-number <code>imageCount</code>, a content hash that is a partial MD5, and a source the
    layout allows, so a <code>flow</code> book with an <code>archive</code> source is rejected. The
    two series fields were added later without a new version: an entry that lacks them reads them as
    <code>null</code>, and only a value of the wrong type rejects the entry. A tag id that a capture
    names but the file does not hold is taken off that capture and reported separately, and the
    capture keeps its other tags.
  </p>
  <p>
    The <code>unreadable</code> section is not read into anything: an import never brings those rows back.
    The reader only counts them, and the preview shows the count as "Unreadable rows kept in the file",
    with "Not imported. The file keeps them as they were stored." A section of the wrong form, such as
    text where the lists should be, counts as zero and does not refuse the file.
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
    <CapturesFileReader />
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
    The hash alone is not enough, because the same book does not always have the same hash: a row
    that could not be read, kept from a pre-release build, can hold a hash computed another way and
    an empty file name, and those rows are matched too. Within one list, every candidate is tried at
    a step before the next step starts, so a hash match beats a file name match; and any match on
    the shelf, even by title, wins over the removed records. A title match skips empty titles and
    "Untitled book". The cost is accepted: two different books with the same title, and no matching
    hash or file name, match each other.
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
