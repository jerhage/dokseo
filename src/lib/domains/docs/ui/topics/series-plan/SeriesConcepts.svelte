<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { ROW_ACROSS_VERSIONS } from './series-diagrams';
  import {
    IDENTITY_SAME_HREF,
    INDEXEDDB_TABS_HREF,
    OFFLINE_UPDATES_HREF,
    RELEASES_BREAKING_HREF,
    SERIES_PLAN_SECTIONS,
    STORAGE_ROWS_HREF,
    seriesPlanHref,
  } from './series-sections';
</script>

<DocsSection title={SERIES_PLAN_SECTIONS.reader}>
  <p>
    Manga and light novels come out in volumes. Someone who reads a series holds a set of files such
    as <code>harbor-lights-01.cbz</code>, <code>harbor-lights-02.cbz</code> and so on, and reads them
    in order. The volumes belong together on the shelf, instead of scattered by the date each was added.
    They sort by volume number, so volume 9 comes before volume 10. And at the last page of volume 3,
    the obvious next step is volume 4.
  </p>
  <p>
    Volume numbers are not always whole. A series can have a special numbered 1.5 between the first
    two volumes, or an extra with no number at all. Dokseo has none of this yet: each book stands on
    its own, and the shelf sorts by date added, title or progress.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.identity}>
  <p>
    Dokseo already answers one question about a file: is it the same book as one it holds? It
    answers from the file itself, by a hash of its content, then its file name, then its title (<a
      href={IDENTITY_SAME_HREF}>When two files are the same book</a
    >). That is <em>identity</em>.
  </p>
  <p>
    A series answers a different question: which books belong together? That is
    <em>grouping</em>. Nothing in a file proves it. An EPUB or a ComicInfo file may state a series
    name, and a folder of page images states nothing. So grouping is a fact the reader asserts about
    books, and the data has to store it as such, not derive it from identity. Two requirements
    follow. Grouping has to survive everything identity survives: removing a book and restoring it,
    and moving captures to another device. And changing a book's series must never change its
    identity, because every capture is filed under the book's id.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.breaking}>
  <p>
    Dokseo keeps everything in the browser: books in the origin private file system, their records
    and the captures in IndexedDB. Each new version of the app reads records that earlier versions
    wrote. An app has no public API, so a change is <a href={RELEASES_BREAKING_HREF}>breaking</a>
    when a reader has to act, or loses something, because of it.
  </p>
  <p>Say a version renames a book's <code>volume</code> field to <code>volumeNumber</code>:</p>
  <StepList>
    <StepItem title="Volumes are set">
      A reader numbers twelve volumes with the version that writes <code>volume</code>.
    </StepItem>
    <StepItem title="The update loads">
      The next version reads <code>volumeNumber</code>. In each stored row that field is absent, so
      it reads as no volume.
    </StepItem>
    <StepItem title="The order is gone">
      The shelf shows the twelve books in no particular order. The numbers are still in storage, but
      no code reads them.
    </StepItem>
  </StepList>
  <p>
    A change of type is worse. If <code>volume</code> became text, every stored number would fail
    the field's check, and each book would be listed as unreadable instead of opening (<a
      href={STORAGE_ROWS_HREF}>Reading a stored row back</a
    >). Adding an optional field breaks nothing: a row written before it existed lacks it, and the
    reading code gives the absence a meaning, such as <code>null</code>. After 1.0, any change of
    the first kind is a major version, and it has to come with a way out for the reader.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.forward}>
  <p>
    <em>Backward compatibility</em> means a new version reads what an older version wrote. Dokseo
    has it through the reading code above: an absent field takes a default.
    <em>Forward compatibility</em> means an older version copes with what a newer version wrote, without
    damaging it.
  </p>
  <p>
    In a browser both matter, because two versions of the app can run against the same database at
    the same time. An older version has no code to check a field that did not exist when it was
    built. The safe answer is to leave that field exactly as it is, and keep it out of the app: read
    strictly, and write back only what was read and checked.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.oldTab}>
  <p>
    The case that makes this concrete is a tab left open across a deploy. Dokseo never reloads by
    itself: a tab offers an update and the reader picks the moment (<a href={OFFLINE_UPDATES_HREF}
      >How an update reaches an open app</a
    >).
  </p>
  <StepList>
    <StepItem title="Two tabs">
      A reader has Dokseo open in two tabs, A and B, both on version 1.0.
    </StepItem>
    <StepItem title="A deploy">
      Version 1.1 adds a field to the book row. Tab B offers the update, the reader takes it, and B
      reloads into 1.1. Tab A keeps running the 1.0 code it loaded.
    </StepItem>
    <StepItem title="The new field is written">
      In tab B the reader sets something that 1.1 stores in the new field.
    </StepItem>
    <StepItem title="The old tab saves">
      The reader goes back to tab A and turns a page. Version 1.0 saves the reading place: it reads
      the row, builds a book from the fields its type names, applies the change and writes.
    </StepItem>
    <StepItem title="The field is gone, or not">
      If the write is the book alone, the new field is deleted, with no error and nothing on screen.
      If the write starts from the stored row, the field survives.
    </StepItem>
  </StepList>
  <Figure>
    <Diagram {...ROW_ACROSS_VERSIONS} />
    {#snippet caption()}
      One book row across two versions of Dokseo. The left ending is what a save that rebuilds the
      row would do; the right is what Dokseo does since the series groundwork.
    {/snippet}
  </Figure>
  <p>
    A new store is a different matter. Adding a store raises the database version, and the open tab
    on the old version receives <code>versionchange</code> and has to close its connection (<a
      href={INDEXEDDB_TABS_HREF}>Blocked upgrades and VersionError</a
    >). A new field raises nothing, so no event reaches the old tab, and only the write itself can
    protect the field. Dokseo's write is described under
    <a href={seriesPlanHref('save')}>The save that keeps unknown fields</a>.
  </p>
</DocsSection>
