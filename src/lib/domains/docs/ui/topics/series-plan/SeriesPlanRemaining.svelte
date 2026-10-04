<script lang="ts">
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    IDENTITY_UNREADABLE_HREF,
    SERIES_PLAN_SECTIONS,
    seriesPlanHref,
  } from './series-sections';
  import { FOLIATE_SERIES } from './series-snippets';
</script>

<DocsSection title={SERIES_PLAN_SECTIONS.remaining}>
  <ul class="col gap-2">
    <li>
      A <code>series</code> store, and the use cases that create, name and assign a series.
    </li>
    <li>
      The edit form's series and volume fields, and a multi-select "Add to series" on the shelf.
    </li>
    <li>Series grouping on the shelf and the "Series order" sort.</li>
    <li>"Next volume" at the end of a book.</li>
    <li>
      Reading series metadata at upload. Dokseo reads an EPUB's package document with its own
      <code>readEpubPackage</code>, which today returns the layout, direction, title and language;
      it would gain the collection, its type and the position. A CBZ is stored as the uploaded
      archive, so its <code>ComicInfo.xml</code> can be read at upload or later; today the upload only
      skips it as a file that is not a page.
    </li>
    <li>Series records in the captures file, and a series scope for capture search.</li>
  </ul>
  <p>
    The EPUB reader, foliate-js, parses series metadata too, but its result is not something to
    build on. In version 1.0.1 the expression reads:
  </p>
  <DocsCode label={FOLIATE_SERIES.label} code={FOLIATE_SERIES.code} />
  <p>
    <code>??</code> binds more tightly than the conditional operator, so the condition is the whole
    of the first two lines. An EPUB 3 series with no calibre tags makes the condition true and
    returns the calibre branch: an object with no name and a position of <code>NaN</code>. I checked
    this by evaluating the same expression in Node, not with a real book. Reading the package
    document in Dokseo's own code avoids depending on it.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.edges}>
  <ul class="col gap-2">
    <li>
      A field that a book row holds and <code>Book</code> does not name is not rejected. It is left out
      of the read, and the next save of that book drops it. Only a migration adds a field to every row,
      so such a field comes from a bug or a hand edit, never from another version.
    </li>
    <li>
      Every format change after 1.0 needs a database version and a migration, even an optional field
      that every reader would leave empty. A series store in the <code>reader</code> database would raise
      the version for a different reason, a new store, but no book row would change for it.
    </li>
    <li>
      A row from before 1.0 that does not match the strict format is unreadable, with no migration.
      A book is repaired by uploading the same file again (<a href={IDENTITY_UNREADABLE_HREF}
        >Rows Dokseo can no longer read</a
      >).
    </li>
  </ul>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.order}>
  <StepList>
    <StepItem title="Data and mapper, built">
      The reserved <code>seriesId</code> and <code>volume</code> in the strict 1.0 book row, removal
      and restore (<a href={seriesPlanHref('built')}>What is built before 1.0</a>).
    </StepItem>
    <StepItem title="Export fields, built">
      Both fields on every book entry of the captures file, still version 1.
    </StepItem>
    <StepItem title="The series store and the edit form">
      A series can be created, named and assigned by hand, one book at a time or several at once.
    </StepItem>
    <StepItem title="The shelf">Grouping and the "Series order" sort.</StepItem>
    <StepItem title="Next volume">Offered at the end of a book in a series.</StepItem>
    <StepItem title="Metadata pre-fill">
      Series and volume suggested at upload from EPUB and ComicInfo metadata.
    </StepItem>
    <StepItem title="Series in the export">
      Series records in the captures file, so the names reach another device.
    </StepItem>
  </StepList>
  <p>
    Each step after the first two is a minor version: it adds something a reader can use, and no
    stored row needs to change for it.
  </p>
</DocsSection>
