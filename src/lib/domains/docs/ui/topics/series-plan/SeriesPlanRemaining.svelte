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
      Only <code>update()</code> keeps unknown fields. Adding a book writes a whole new row, so when
      an upload repairs an unreadable row by restoring over it (<a href={IDENTITY_UNREADABLE_HREF}
        >Rows Dokseo can no longer read</a
      >), any field the running version does not name is replaced.
    </li>
    <li>
      Removing a book builds the removed record from the fields the running version names, so a
      field it does not name stays out of the record and is gone after a restore. Series ids and
      volumes are named from 1.0 on, which is why they were reserved before it.
    </li>
    <li>
      A kept field is kept unchecked. The version that added it checks it on the way in, like any
      other field, and a damaged value makes the row unreadable there.
    </li>
  </ul>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.order}>
  <StepList>
    <StepItem title="Data and mapper, built">
      The save that keeps unknown fields, the reserved <code>seriesId</code> and
      <code>volume</code>, removal and restore (<a href={seriesPlanHref('built')}
        >What is built before 1.0</a
      >).
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
