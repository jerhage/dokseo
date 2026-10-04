<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { SERIES_MODEL } from './series-diagrams';
  import {
    ARCHITECTURE_GRAPH_HREF,
    EXPORT_IDS_HREF,
    EXPORT_VERSIONS_HREF,
    IDENTITY_LADDER_HREF,
    INDEXEDDB_TABS_HREF,
    SERIES_PLAN_SECTIONS,
    seriesPlanHref,
  } from './series-sections';

  const REFERENCE_OPTIONS = [
    {
      option: 'A series name on each book',
      gains: 'No new record. The cheapest to build and to show.',
      costs:
        'Renaming a series edits every member. Two series with the same name merge, and a typo splits one in two. Nothing can be attached to the series itself.',
    },
    {
      option: 'A series id on each book, and a series record',
      gains:
        'A rename is one write. Equal names stay apart. Settings for a whole series have a place to live.',
      costs: 'A new store, its use cases, and a lookup to show the name.',
    },
  ] as const;

  const STORE_OPTIONS = [
    {
      option: 'Fields on the book only',
      costs:
        'The series is only its name, with the costs above. The book row and its copies hold everything.',
    },
    {
      option: 'A series store and a separate membership store',
      costs:
        'Book rows stay untouched, but every grouping is a write across two stores, and removing a book needs membership cleanup.',
    },
    {
      option: 'A series id and a volume on the book, a series store for the rest',
      costs:
        'One extra lookup for the name. Removal, restore and export copy the membership with the book, because it is part of the book row.',
    },
  ] as const;
</script>

<DocsSection title={SERIES_PLAN_SECTIONS.reference}>
  <p>
    The first sketch of this feature put a series name and a number straight on the book, with no
    new kind of record. It was the cheapest option, and for display alone it would do. I chose an id
    instead:
  </p>
  <Table size="sm" caption="How a book names its series">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Option</TableHeaderCell>
        <TableHeaderCell>Gains</TableHeaderCell>
        <TableHeaderCell>Costs</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each REFERENCE_OPTIONS as row (row.option)}
        <TableRow>
          <TableHeaderCell scope="row">{row.option}</TableHeaderCell>
          <TableCell>{row.gains}</TableCell>
          <TableCell>{row.costs}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The EPUB specification says the same about names: unrelated collections can share one, which is
    why it asks for an identifier. The id also travels: as a UUID it names the same series on every
    device, the way a tag id does in an export (<a href={EXPORT_IDS_HREF}
      >Local ids and global ids</a
    >).
  </p>
  <Figure>
    <Diagram {...SERIES_MODEL} />
    {#snippet caption()}
      The planned model. Each book row holds a series id and its own volume; the series record holds
      the name once.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.store}>
  <p>Where membership lives was a separate choice:</p>
  <Table size="sm" caption="Where a book's membership is stored">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Option</TableHeaderCell>
        <TableHeaderCell>Trade-off</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each STORE_OPTIONS as row (row.option)}
        <TableRow>
          <TableHeaderCell scope="row">{row.option}</TableHeaderCell>
          <TableCell>{row.costs}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    I chose the last. A book belongs to at most one series, so one id field is enough, and keeping
    it on the book means every path that already copies a book's fields copies the membership too.
    The series store itself comes with the feature, not before: 1.0 has the reference and no record
    to resolve it.
  </p>
  <p>
    Where that store lives is still open. A new store in the existing <code>reader</code> database
    raises its version from 3 to 4, so a tab still open on the old version receives
    <code>versionchange</code> and closes its connection (<a href={INDEXEDDB_TABS_HREF}
      >Blocked upgrades and VersionError</a
    >). A separate database avoids the upgrade, at the cost of one more database to open and to
    report in storage settings.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.assignment}>
  <p>
    Assignment starts by hand: a series and a volume in the book's edit form, and a multi-select
    "Add to series" on the shelf for a whole run of volumes at once. Pre-filling from metadata comes
    after that, at upload, from EPUB <code>belongs-to-collection</code> and
    <code>group-position</code> and from ComicInfo <code>Series</code> and <code>Number</code>.
    Manual comes first because metadata is optional and may be absent, so the form is needed in any
    case.
  </p>
  <p>
    Titles are never parsed into a series without the reader confirming it. A title such as
    <code>Volume 1</code> says nothing about which series it belongs to, and book matching already
    shows what a title match between two unrelated books does: the title step can restore one
    series' first volume into another's (<a href={IDENTITY_LADDER_HREF}>The matching ladder</a>).
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.volume}>
  <p>
    The volume is a number for ordering, and the label a reader sees, such as "Volume 3", is derived
    from it. A number sorts without a collator, fits a special at 1.5, and makes "the next volume" a
    comparison. A whole number alone would reject 1.5. A text volume would hold "Extra", but it
    would need parsing every time it is sorted or compared. A ComicInfo <code>Number</code> is parsed
    when it reads as a number, and otherwise leaves the volume empty for the reader to fill in.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.shelf}>
  <p>
    On the shelf, a series will show as a group, either as one stacked card or as a grouped view;
    which of the two is not decided. A "Series order" sort will join Recently added, Title and Most
    read. At the end of a book in a series, Dokseo will offer the next volume. Capture search can
    later gain a series scope: captures are filed by book, so a series' captures are those of its
    members together.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.exportFile}>
  <p>
    The captures file gained the two fields without a new version number. A raised version number
    stops older readers (<a href={EXPORT_VERSIONS_HREF}>A versioned file format</a>), and that is
    right when a field changes meaning. Two optional fields change no meaning: an older Dokseo
    reading a newer file builds each book entry from the fields it reads and leaves the rest out,
    and a newer Dokseo reads an older file's missing fields as <code>null</code>. Series names, once
    the store exists, can follow the same way, as a new section of the file that older versions
    leave unread.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.owner}>
  <p>
    Series belong to the <code>library</code> domain. <code>library</code> is a leaf, and the book
    row holds the series id, so a separate <code>series</code> domain would have to import
    <code>library</code> for its books and the next volume, and could not be a leaf itself (<a
      href={ARCHITECTURE_GRAPH_HREF}>Dokseo's domain graph</a
    >). The export, in <code>storage</code>, already reads the library and needs no new import for
    the two fields. See <a href={seriesPlanHref('remaining')}>What remains to build</a> for the pieces
    this domain still has to gain.
  </p>
</DocsSection>
