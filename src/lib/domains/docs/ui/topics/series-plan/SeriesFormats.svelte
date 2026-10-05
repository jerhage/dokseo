<script lang="ts">
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { SERIES_PLAN_SECTIONS } from './series-sections';

  const EPUB_SERIES = `<metadata>
  <meta property="belongs-to-collection" id="c01">Harbor Lights</meta>
  <meta refines="#c01" property="collection-type">series</meta>
  <meta refines="#c01" property="group-position">3</meta>
</metadata>`;

  const CALIBRE_SERIES = `<meta name="calibre:series" content="Harbor Lights"/>
<meta name="calibre:series_index" content="3"/>`;

  const COMIC_INFO = `<ComicInfo>
  <Series>Harbor Lights</Series>
  <Number>3</Number>
</ComicInfo>`;

  const FORMAT_FIELDS = [
    {
      format: 'EPUB 3',
      name: 'belongs-to-collection',
      position: 'group-position: a whole number, or numbers joined by dots such as 2.2.1',
      kind: 'collection-type: series or set',
    },
    {
      format: 'EPUB written by calibre',
      name: 'calibre:series',
      position: 'calibre:series_index, read by calibre as a decimal',
      kind: 'always a series',
    },
    {
      format: 'ComicInfo.xml',
      name: 'Series, text',
      position: 'Number, text; Volume, a whole number',
      kind: 'Count, the number of books in the series',
    },
  ] as const;
</script>

<DocsSection title={SERIES_PLAN_SECTIONS.formats}>
  <p>
    Some book files state their series. An EPUB 3 package document can say that the publication
    belongs to a collection, refine the collection's type to <code>series</code>, and give the
    publication's position in it:
  </p>
  <DocsCode label="EPUB 3 package metadata" code={EPUB_SERIES} />
  <p>
    The EPUB 3.3 specification defines <code>series</code> as
    <q
      >a sequence of related works that are formally identified as a group, typically open-ended
      with works issued individually over time</q
    >, and <code>set</code> as a finite collection, typically issued together. A
    <code>group-position</code> is
    <q>a single xsd:unsignedInt or series of decimal-separated numbers (e.g., 1 or 2.2.1)</q>, and
    the specification's own example uses 98.4 for volume 98, issue 4 of a periodical, so the value
    is not always a decimal number. Because unrelated collections can share a name, the
    specification also says creators should give each collection an identifier.
  </p>
  <p>
    calibre writes the series of an older OPF 2 package in tags of its own. calibre's OPF 3 reader
    takes <code>belongs-to-collection</code> with the type <code>series</code> first and falls back
    to these, and when it writes series metadata into an OPF 3 file it replaces them with
    <code>belongs-to-collection</code>:
  </p>
  <DocsCode label="calibre's series tags" code={CALIBRE_SERIES} />
  <p>
    Comic archives such as CBZ files have no package document, but some include a
    <code>ComicInfo.xml</code>, a format that began with the ComicRack application and is now
    documented by the Anansi Project. Its schema types <code>Series</code> and
    <code>Number</code> as text and <code>Volume</code> and <code>Count</code> as whole numbers.
    <code>Number</code> is the book's number in the series, so it can hold <code>1.5</code> or
    <code>Extra</code>. <code>Volume</code> is, in the documentation's words,
    <q>a notion that is specific to US Comics, where the same series can have multiple volumes</q>,
    numbered or named by year, so a manga volume belongs in <code>Number</code>.
  </p>
  <DocsCode label="ComicInfo.xml" code={COMIC_INFO} />
  <Table size="sm" caption="Where each format keeps a series">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Format</TableHeaderCell>
        <TableHeaderCell>Series name</TableHeaderCell>
        <TableHeaderCell>Position</TableHeaderCell>
        <TableHeaderCell>Also</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each FORMAT_FIELDS as row (row.format)}
        <TableRow>
          <TableHeaderCell scope="row">{row.format}</TableHeaderCell>
          <TableCell><code>{row.name}</code></TableCell>
          <TableCell>{row.position}</TableCell>
          <TableCell>{row.kind}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    Dokseo reads only a title from a PDF, and a folder of page images has no metadata at all. Every
    one of these sources is optional, so metadata can suggest a series but never be the only way to
    set one.
  </p>
</DocsSection>
