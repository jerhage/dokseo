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
    >). Adding a field is a change too. Dokseo reads every row strictly, with no defaults, so a row
    written before the field existed lacks it and fails the same way. Before 1.0, Dokseo owes the
    rows of a pre-release build nothing: a row in an older format is listed as unreadable, with a
    way out. From 1.0 on, every change to what a row holds comes with a migration.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.versions}>
  <p>
    <em>Backward compatibility</em> means a new version reads what an older version wrote.
    <em>Forward compatibility</em> means an older version copes with what a newer version wrote, without
    damaging it. In a browser both matter, because two versions of the app can run against the same database
    at the same time.
  </p>
  <p>
    One way to get both is in the reading code: every version gives an absent field a default, and
    every save starts from the stored row so that a field it does not name stays as it was. Each
    read then has to cope with any row any version ever wrote. A default also hides damage: a row
    with an unknown language reads as if it were Japanese, and the next save stores that guess.
  </p>
  <p>
    Dokseo uses the version number IndexedDB already gives each database instead. From 1.0 on, a
    change to a stored row raises the database version, and the upgrade that runs on the next open
    rewrites every row into the new format. That migration is the backward compatibility: the new
    version only ever reads rows in its own format. Forward compatibility is replaced by a refusal:
    an older build cannot open a database at a higher version than its own, so it never reads or
    writes a row it does not know. That is why reads can stay strict, with one rule per field and no
    defaults, and why a save can write the edited book as it is.
  </p>
  <p>
    The cost is that every format change, even one new optional field, needs a version and a
    migration, and every tab still open on the old build has to reload before it can save again.
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
      Version 1.1 adds a field to the book row, so it raises the database version, and its upgrade
      writes the field into every stored book. Tab B offers the update, the reader takes it, and B
      reloads into 1.1. Tab A keeps running the 1.0 code it loaded.
    </StepItem>
    <StepItem title="The upgrade runs">
      Tab B opens the database at the new version. IndexedDB sends <code>versionchange</code> to tab A's
      connection, Dokseo closes it, and the upgrade rewrites the rows.
    </StepItem>
    <StepItem title="The old tab saves">
      The reader goes back to tab A and turns a page. Saving the reading place reopens the database
      at the version 1.0 was built with, which is now lower than the stored one, and the open fails
      with a <code>VersionError</code>. Nothing is written, and the message asks the reader to
      reload the page.
    </StepItem>
    <StepItem title="The reload">
      Tab A reloads into 1.1, which reads the rows in the format it wrote.
    </StepItem>
  </StepList>
  <Figure>
    <Diagram {...ROW_ACROSS_VERSIONS} />
    {#snippet caption()}
      One database across two versions of Dokseo. The old tab cannot save over the new rows, because
      it cannot open the database at all.
    {/snippet}
  </Figure>
  <p>
    A build of 1.0 that starts after the upgrade, from a cached copy for example, meets the same
    <code>VersionError</code> on its first open (<a href={INDEXEDDB_TABS_HREF}
      >Blocked upgrades and VersionError</a
    >). Without the version, nothing would reach the old tab. It would read the new rows with the
    1.0 rules, and its next save would write a book built from the fields 1.0 names, which drops the
    new field. Dokseo's save is described under
    <a href={seriesPlanHref('read')}>A strict read, and a save of the edited book</a>.
  </p>
</DocsSection>
