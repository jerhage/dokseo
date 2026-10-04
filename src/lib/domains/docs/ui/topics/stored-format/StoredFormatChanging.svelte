<script lang="ts">
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { formatChanged } from '$lib/shared/testing/stored-format/stored-shape';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    INDEXEDDB_UPGRADES_HREF,
    RELEASES_BREAKING_HREF,
    SERIES_OLD_TAB_HREF,
    STORED_FORMAT_SECTIONS,
  } from './stored-format-sections';
  import { RECOGNITION_UPGRADE, ROW_PIN } from './stored-format-snippets';

  const PINS = [
    {
      spec: 'src/lib/domains/library/adapters/book-row-format.spec.ts',
      holds:
        'The three book fixtures read back exactly; add and update write exactly their keys and types; the reader database layout.',
    },
    {
      spec: 'src/lib/domains/library/adapters/page-list-row-format.spec.ts',
      holds: 'The page list reads back; add and savePageList write { id, names }.',
    },
    {
      spec: 'src/lib/domains/library/adapters/removed-book-row-format.spec.ts',
      holds: 'Both removed records read back; remove and addRemoved write exactly their keys.',
    },
    {
      spec: 'src/lib/domains/recognition/adapters/capture/capture-row-format.spec.ts',
      holds:
        'The four capture fixtures read back; save and moveBook write exactly their keys; the recognition database layout.',
    },
    {
      spec: 'src/lib/domains/recognition/adapters/tag/tag-row-format.spec.ts',
      holds: 'Both tag fixtures read back, and save writes them unchanged.',
    },
    {
      spec: 'src/lib/domains/storage/use-cases/captures-file-v1-golden.spec.ts',
      holds:
        'The golden file reads exactly, its unreadable rows stay as stored, and the builder writes the same bytes.',
    },
  ] as const;
</script>

<DocsSection title={STORED_FORMAT_SECTIONS.pins}>
  <p>
    The fixtures live in <code>src/lib/shared/testing/stored-format/</code>: one full row for each
    variant of each record kind, a few unreadable rows, the database layouts as literals, and the
    golden file. Each spec reads its fixtures with the real mapper, then makes the real repository
    write them and compares what it wrote. The repositories run against a recording stand-in for
    IndexedDB, and the real <code>upgrade</code> function creates the stores, so the layout is checked
    too.
  </p>
  <Table size="sm" caption="The specs that pin the 1.x format">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Spec</TableHeaderCell>
        <TableHeaderCell>Holds</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each PINS as row (row.spec)}
        <TableRow>
          <TableCell><code>{row.spec}</code></TableCell>
          <TableCell>{row.holds}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    Each write is compared three ways: the whole row, its sorted key list, and a table of types.
  </p>
  <DocsCode label={ROW_PIN.file} code={ROW_PIN.code} />
  <p>A failing pin says why it exists and what to do instead of editing it:</p>
  <DocsCode label="formatChanged('a book row')" code={formatChanged('a book row')} />
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.changing}>
  <p>
    Before 1.0, a change to a stored row is a change to the mapper, the fixture and the pin in the
    same commit. Rows written by an older pre-release build become unreadable and take the way out
    above.
  </p>
  <p>
    After 1.0, the same change to a book, page list, removed record, capture or tag takes four
    steps:
  </p>
  <StepList>
    <StepItem title="Raise the database version">
      In the adapter that opens the database, for example <code>reader</code> from 3 to 4.
    </StepItem>
    <StepItem title="Migrate in the upgrade">
      The <code>upgrade</code> function runs in the version-change transaction before any page can
      use the new version (<a href={INDEXEDDB_UPGRADES_HREF}>Version upgrades</a>). It rewrites
      every row already stored into the new format. The reads stay strict; they never learn the old
      format.
    </StepItem>
    <StepItem title="Update the pins">
      The fixture, the key list and type table in the spec, and the database literal. Never the
      other way round: a pin is changed because the format changed on purpose, never to make a test
      pass.
    </StepItem>
    <StepItem title="Release it as a major version">
      A commit marked <code>feat!:</code> or with a <code>BREAKING CHANGE:</code> footer (<a
        href={RELEASES_BREAKING_HREF}>Breaking, for an app with no API</a
      >). A tab still on the old build cannot open the new version, and reloads (<a
        href={SERIES_OLD_TAB_HREF}>An old tab across a deploy</a
      >).
    </StepItem>
  </StepList>
  <p>
    The <code>recognition</code> upgrade shows the form an upgrade takes in Dokseo: it creates only
    what is missing, so one function brings a database from any earlier version to the current one.
    Version 5 added the <code>tagIds</code> index to an existing store through the version-change transaction:
  </p>
  <DocsCode label={RECOGNITION_UPGRADE.file} code={RECOGNITION_UPGRADE.code} />
  <p>
    The captures file has its own rule, because files written by older builds never pass through an
    upgrade. Within 1.x a v1 file may only gain an optional part that every 1.x reader ignores, as
    the
    <code>unreadable</code> section was added. Such a change leaves
    <code>captures-v1.golden.json</code> exactly as it is, still importing, and adds a second golden file
    for the new bytes. Any other change is version 2 of the file, with the v1 reader kept.
  </p>
</DocsSection>

<DocsSection title={STORED_FORMAT_SECTIONS.rule}>
  <ul class="prose">
    <li>Read every stored field with one check and no default. A row that fails is unreadable.</li>
    <li>Show an unreadable row apart, with a way out that keeps the reader’s work.</li>
    <li>
      Change a 1.x row only with a database version, an upgrade that rewrites every row, and a major
      release.
    </li>
    <li>Change a pin only in the commit that changes the format on purpose.</li>
    <li>Keep every v1 captures file importing for all of 1.x.</li>
  </ul>
</DocsSection>
