<script lang="ts">
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    RELEASES_BREAKING_HREF,
    RELEASES_SEMVER_HREF,
    SERIES_OLD_TAB_HREF,
    SERIES_VERSIONS_HREF,
    STORED_FORMAT_SECTIONS,
    storedFormatHref,
  } from './stored-format-sections';

  const READ_OPTIONS = [
    {
      option: 'Lenient reads',
      how: 'An absent or unknown value reads as a default. A save starts from the stored row, so fields it does not name stay as they were.',
      gains:
        'A row from any earlier version keeps loading with no migration. A tab on an older build does not erase a field a newer build added.',
      costs:
        'Every read has to cope with every row any version ever wrote, forever. A default hides damage: a row with an unknown language reads as Japanese, and the next save stores that guess.',
    },
    {
      option: 'Strict reads and version migrations',
      how: 'One check per field and no defaults. A format change raises the database version, and the upgrade rewrites every stored row.',
      gains:
        'A row either matches the current format or is listed as unreadable. Each version reads one format only. An older build cannot open the newer database, so it never overwrites a newer row.',
      costs:
        'Every change, even one optional field, needs a version and a migration. A tab still on the old build has to reload before it can save.',
    },
  ] as const;

  const COVERED = [
    'Book rows',
    'Page lists',
    'Removed-book records',
    'Capture rows',
    'Tag rows',
    'The names of the book files in OPFS',
    'The captures file, version 1',
  ] as const;

  const OUTSIDE = [
    {
      part: 'Model download consent',
      fallback: 'A row that fails its checks counts as no decision, so the reader is asked again.',
    },
    {
      part: 'Recognizer setup (model and compute)',
      fallback: 'An unknown model or compute choice falls back to the language’s default.',
    },
    { part: 'EPUB reading settings', fallback: 'Each setting falls back to its default.' },
    {
      part: 'Preferences in localStorage',
      fallback: 'Each key’s reader checks its value and falls back to the default.',
    },
    {
      part: 'Partial model downloads in OPFS, model weights and the app shell in the Cache API',
      fallback: 'Downloaded again.',
    },
  ] as const;
</script>

<DocsSection title={STORED_FORMAT_SECTIONS.promise}>
  <p>
    Dokseo has no server. Book files sit in the browser’s origin private file system, and the
    records about them, the captures and the tags sit in IndexedDB. Each new build of the app opens
    the same database and reads rows that earlier builds wrote, so the format of those rows is an
    interface between versions of the app, even though no other program reads it.
  </p>
  <p>
    A <em>stored-format promise</em> names that interface: which records a range of versions will
    keep reading, and what each field of each record holds. Dokseo’s promise is tied to its
    <a href={RELEASES_SEMVER_HREF}>semantic version</a>: every 1.x build reads every row any 1.x
    build wrote. A change that would leave a stored row unreadable without the reader doing
    something is a <a href={RELEASES_BREAKING_HREF}>breaking change</a>, and needs a 2.0.
  </p>
  <p>
    Before 1.0 there is no promise. A row written by a pre-release build that does not match the 1.x
    format is listed as unreadable, with a way out (<a href={storedFormatHref('unreadable')}
      >{STORED_FORMAT_SECTIONS.unreadable}</a
    >).
  </p>
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.strands}>
  <p>
    A capture of a manga panel stores the box around the text. Before 1.0, Dokseo stored that box in
    pixels of the page image. It now stores fractions of the page, so a box on a PDF page no longer
    depends on the size the page is drawn at. Here is what that change does to a row nobody
    migrates:
  </p>
  <StepList>
    <StepItem title="A capture is taken">
      An older build stores the box as <code>x: 812, y: 96, width: 140, height: 512</code>, in
      pixels.
    </StepItem>
    <StepItem title="The app updates">
      The next build reads <code>x</code> as a fraction of the page width. 812 page widths is far off
      the right edge.
    </StepItem>
    <StepItem title="The box is drawn">
      Read without a check, the highlight would sit far outside the page. The text is still in
      storage, but the box no longer shows where it came from.
    </StepItem>
  </StepList>
  <p>
    Renaming a field strands data in the same way, without an error: the new build reads the new
    name, finds nothing, and the old value sits unread. Adding a required field strands every row
    written before it.
  </p>
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.options}>
  <p>An app can live with an old row in one of two ways:</p>
  <Table size="sm" caption="Two ways to read rows across versions">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Approach</TableHeaderCell>
        <TableHeaderCell>How</TableHeaderCell>
        <TableHeaderCell>Gains</TableHeaderCell>
        <TableHeaderCell>Costs</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each READ_OPTIONS as row (row.option)}
        <TableRow>
          <TableHeaderCell scope="row">{row.option}</TableHeaderCell>
          <TableCell>{row.how}</TableCell>
          <TableCell>{row.gains}</TableCell>
          <TableCell>{row.costs}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    I chose strict reads and version migrations. Dokseo read leniently before 1.0, and each default
    was a rule every later version would have had to keep. Several of them also wrote their guess
    back on the next save: a book’s language, a capture’s origin, a tag’s color. With strict reads,
    the rule for a field is in one place, a damaged row is listed instead of repaired by a guess,
    and a migration converts old rows once instead of every read converting them again.
  </p>
  <p>
    The version half is what makes strictness safe across tabs. IndexedDB gives each database a
    version number, and a page cannot open a database at a lower version than the one stored. So
    when a newer build raises the version, a tab still running the old build cannot open the
    database at all, and cannot write a row in the old format over a migrated one. The series plan
    walks through that case step by step (<a href={SERIES_OLD_TAB_HREF}
      >An old tab across a deploy</a
    >) and compares the two kinds of compatibility (<a href={SERIES_VERSIONS_HREF}
      >Compatibility through database versions</a
    >).
  </p>
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.scope}>
  <p>
    The promise covers what a reader would lose for good, or have to rebuild by hand, if it stopped
    reading:
  </p>
  <ul class="prose">
    {#each COVERED as part (part)}
      <li>{part}</li>
    {/each}
  </ul>
  <p>
    Everything else Dokseo stores can be lost without losing work. Each of these falls back to a
    default when it cannot be read, so it stays outside the promise and can change in a minor
    version:
  </p>
  <Table size="sm" caption="Stored data outside the promise">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Data</TableHeaderCell>
        <TableHeaderCell>When it cannot be read</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each OUTSIDE as row (row.part)}
        <TableRow>
          <TableHeaderCell scope="row">{row.part}</TableHeaderCell>
          <TableCell>{row.fallback}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</DocsSection>
