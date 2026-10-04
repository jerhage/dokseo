<script lang="ts">
  import type { Snippet } from 'svelte';
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { IMPORT_PIPELINE } from './export-import-diagrams';
  import { EXPORT_IMPORT_SECTIONS } from './export-import-sections';
  import { APPLY_IMPORT, NEWER_SIDE, PLAN_CAPTURE } from './export-import-snippets';

  type Props = { devices: Snippet };

  let { devices }: Props = $props();

  const CLASSES = [
    {
      kind: 'new',
      when: 'No readable capture here has the id.',
      onImport: 'Added to the matched book, or held under a removed-book record.',
    },
    {
      kind: 'identical',
      when: 'Same text and note, and the file adds no tag.',
      onImport: 'Nothing is written.',
    },
    {
      kind: 'tags-only',
      when: 'Same text and note, and the file adds a tag.',
      onImport: 'The union of the tags is written.',
    },
    {
      kind: 'conflict',
      when: 'The text or the note differs.',
      onImport: 'The chosen rule settles it; the tags are the union either way.',
    },
  ] as const;

  const STATES = [
    { state: 'idle', shows: 'The drop zone.' },
    { state: 'reading', shows: 'Reading…, while the file is read and planned.' },
    { state: 'not-an-export', shows: 'This file is not a captures export.' },
    {
      state: 'newer-version',
      shows:
        'This file comes from a newer version of the app. Update the app, then import it again.',
    },
    {
      state: 'storage-unavailable',
      shows: 'This browser blocks local storage, so captures cannot be imported.',
    },
    { state: 'preview', shows: 'The counts, and the rule for conflicts: newer or this device.' },
    {
      state: 'reviewing',
      shows: 'The counts and every conflict, with a choice and an edit open or not.',
    },
    { state: 'importing', shows: 'Importing…' },
    { state: 'imported', shows: 'Import finished, with what was added, updated, kept and held.' },
  ] as const;
</script>

<DocsSection title={EXPORT_IMPORT_SECTIONS.plan}>
  <p>
    An import never writes while it works out what to do. <code>previewCapturesImport</code> reads
    the file, lists the shelf, the removed and unreadable books, the tags and every capture, and
    passes them to <code>planCapturesImport</code>. That function is pure: it reads nothing and
    writes nothing, and the only things it does not compute from its inputs are the ids and the time
    it is given for new removed-book records. The plan holds every book match, every tag mapping,
    every capture's class and the counts the preview shows.
  </p>
  <Figure>
    <Diagram {...IMPORT_PIPELINE} />
    {#snippet caption()}
      The import pipeline. Everything above Apply only reads, so a rejected file or a Cancel leaves
      the device untouched.
    {/snippet}
  </Figure>
  <p>Each capture in the file is matched by id and falls into one of four classes:</p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Class</TableHeaderCell>
        <TableHeaderCell>When</TableHeaderCell>
        <TableHeaderCell>On import</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each CLASSES as row (row.kind)}
        <TableRow>
          <TableCell><code>{row.kind}</code></TableCell>
          <TableCell>{row.when}</TableCell>
          <TableCell>{row.onImport}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <DocsCode label={PLAN_CAPTURE.label} code={PLAN_CAPTURE.code} />
  <p>
    A capture that is already here stays on the book it is on here, even when the file's book
    matched a different one; the plan counts those as <code>onAnotherBook</code>. A capture here
    that could not be read is not in the list the plan compares against, so a file capture with its
    id is
    <code>new</code>, and writing it replaces the damaged row with a good one.
  </p>
  <p>
    For each absent book the plan makes one removed-book record, with a new id, the file's identity
    and the preview's time, and only when the book receives at least one new capture. All of that
    book's captures share the record.
  </p>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.apply}>
  <p>
    <code>applyCapturesImport</code> takes the plan and the conflict rule and writes in a fixed order:
    removed-book records, then new tags, then captures. A capture refers to a book id and to tag ids,
    so writing those first means no capture is ever stored referring to something that is not there yet.
  </p>
  <DocsCode label={APPLY_IMPORT.label} code={APPLY_IMPORT.code} />
  <p>
    The first failed write stops the import with <code>storage-unavailable</code>, and what was
    written stays: there is no rollback. That is safe because every write is an add or an update by
    id. Importing the file again plans against what landed: the new records match the file's books
    by hash, the new tags match by name, and the captures already written are identical, so the
    second run writes only what is missing.
  </p>
  <p>
    The rule for conflicts is one of three. <code>newer</code> compares
    <code>editedAt ?? createdAt</code>, and only a strictly larger time on the file's side takes the
    file's version, so a tie keeps this device's. <code>this-device</code> always keeps this
    device's. <code>review</code> holds a choice per conflict: the device's version, the file's version
    written whole (text, note, edit time and anchor), or a hand edit, which starts from this device's
    version and is stamped with the time of the import. A conflict with no choice keeps this device's
    version. In every case the tags are the union of both sides.
  </p>
  <DocsCode label={NEWER_SIDE.label} code={NEWER_SIDE.code} />
  <p>
    The result counts what happened: <code>added</code>, <code>updated</code> (tags only, the file's
    version, or an edit), <code>kept</code> (this device's version won), <code>held</code> (added
    under a removed-book record) and <code>tagsCreated</code>.
  </p>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.devices}>
  <p>
    The phone and the laptop below share one book, Harbor Lights, under different local ids. The
    laptop already holds one capture from an earlier exchange, and a tag "Vocab" it created itself.
    The phone also has Paper Lanterns, which the laptop does not. Some things to try:
  </p>
  <ul>
    <li>
      Export from the phone as it is: two new captures, one of them held for a book not on the
      laptop, and one identical.
    </li>
    <li>
      Edit the first capture on both devices, then export from either. The edit made later wins
      under Keep the newer edit.
    </li>
    <li>
      Stop the clock, edit both again, and import: the tie keeps the importing device's version.
    </li>
    <li>Choose Review all, pick a side or edit by hand, and import.</li>
    <li>
      Import the same file again: the preview has nothing to write, and applying it writes 0
      records.
    </li>
  </ul>
  <DocsDemo label="Two devices" resettable>
    {@render devices()}
    {#snippet caption()}
      Each device is held in memory. Export runs the real <code>buildCapturesFile</code>, and import
      runs the real <code>previewCapturesImport</code> and <code>applyCapturesImport</code> through the
      import screen's real view model and conflict review, against stand-in repositories. Nothing touches
      this browser's databases.
    {/snippet}
  </DocsDemo>
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.screen}>
  <p>
    The import lives in Settings › Your data, under Import. Its view model,
    <code>CapturesImportView</code>, holds one named state at a time, and the screen shows what each
    one means:
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>State</TableHeaderCell>
        <TableHeaderCell>The screen shows</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each STATES as row (row.state)}
        <TableRow>
          <TableCell><code>{row.state}</code></TableCell>
          <TableCell>{row.shows}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The preview lists only the counts that are not zero: New captures, Already here (identical and
    tags-only together), Conflicts, For books not on this device, New tags and Could not be read,
    with a line for each skipped entry. The choice of rule appears only when there are conflicts,
    and starts on Keep the newer edit. When nothing would be written, the preview says "Everything
    in this file is already here." and offers only Close.
  </p>
  <p>
    Review all shows each conflict's two versions as tiles, labeled This device and File with
    "Edited" or "Captured" and a date. Edit opens the text, and the note unless the capture was
    typed by hand (which has no note). An unsaved edit is never used: Import is disabled while one
    is open, and picking a side replaces a saved edit.
  </p>
  <p>
    After an import, the view model invalidates the whole query cache, so the library and the
    capture panel show the new captures without a reload. The whole cache, rather than the library's
    and the captures' keys, because the <code>storage</code> domain may not import another domain's query
    keys, and copying the key strings by hand would let them drift apart.
  </p>
</DocsSection>
