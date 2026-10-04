<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    EXPORT_FORMAT_HREF,
    IDENTITY_REMOVED_HREF,
    RELEASES_BREAKING_HREF,
    SERIES_PLAN_SECTIONS,
    STORAGE_ROWS_HREF,
    seriesPlanHref,
  } from './series-sections';
  import {
    BOOK_SERIES_FIELDS,
    FILE_SERIES_FIELDS,
    FINITE_NUMBER_OR_NULL,
    REMOVED_SERIES_FIELDS,
    REPOSITORY_UPDATE,
    RESTORE_SERIES_FIELDS,
    SAVED_BOOK_ROW,
    STORED_SERIES_FIELDS,
  } from './series-snippets';
</script>

<DocsSection title={SERIES_PLAN_SECTIONS.built}>
  <p>
    Nothing of the series feature is visible yet. What is built is groundwork that changes how
    Dokseo 1.0 treats a book row, so that series can arrive in a later 1.x release as a minor
    version, with no reader having to act (<a href={RELEASES_BREAKING_HREF}
      >Breaking, for an app with no API</a
    >). The groundwork is a book save that keeps the fields it does not name, a series id and a
    volume reserved on the book, and both fields copied wherever a book's fields are copied.
  </p>
  <p>
    The groundwork has to be in 1.0 because of those copies. Removing a book keeps a record built
    from the fields the removing version names, and an export writes the fields the exporting
    version names. If series ids arrived only in a later version, a reader who removed a grouped
    book in a tab still running 1.0, or exported from that tab, would lose the grouping. With the
    fields reserved, every 1.x version reads, checks and copies them.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.save}>
  <p>
    Every edit to a stored book, a new reading place, a rename or a change of layout, goes through
    the library repository's <code>update()</code>:
  </p>
  <DocsCode label={REPOSITORY_UPDATE.file} code={REPOSITORY_UPDATE.code} />
  <p>
    The row is read with <code>bookFromStored</code>, which checks every field <code>Book</code>
    names and throws a <code>CorruptRow</code> for a bad one, so a damaged row is never written back
    (<a href={STORAGE_ROWS_HREF}>Reading a stored row back</a>). The edit is applied to the checked
    book, and the row is written by <code>savedBookRow</code>:
  </p>
  <DocsCode label={SAVED_BOOK_ROW.file} code={SAVED_BOOK_ROW.code} />
  <p>
    The order of the two spreads is the whole rule. The stored row goes first, so a field that
    <code>Book</code> does not name stays in the row, unchecked. The book goes second, so every
    field <code>Book</code> names comes from the checked value, fallbacks included: a stored
    language of <code>xx</code> reads as Japanese and is written back as <code>ja</code>. Reading is
    unchanged, and an unknown field never reaches the app. Before this, <code>update()</code>
    wrote the book alone, which is the left ending of the diagram in
    <a href={seriesPlanHref('oldTab')}>An old tab across a deploy</a>.
  </p>
  <p>
    A save also changes only the fields in its edit. <code>update()</code> reads the row at the moment
    of saving, so a page turn in one tab does not undo a rename made in another.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.reserved}>
  <p>The book type has two fields that every book holds as <code>null</code> today:</p>
  <DocsCode label={BOOK_SERIES_FIELDS.file} code={BOOK_SERIES_FIELDS.code} />
  <p>
    <code>seriesId</code> is a reference to a series record that does not exist yet.
    <code>SeriesId</code> is a branded string from <code>shared/ids.ts</code>. A series id is meant
    to be a UUID, like a tag or capture id, so it means the same series on every device; reading
    accepts any text.
    <code>volume</code> is the book's position in the series. Both are read like the alias: an
    absent field is <code>null</code>, so every row stored before the fields existed stays readable,
    and a value of the wrong type makes the row unreadable.
  </p>
  <DocsCode label={STORED_SERIES_FIELDS.file} code={STORED_SERIES_FIELDS.code} />
  <p>
    A volume must also be finite. IndexedDB stores structured clones, which can hold
    <code>NaN</code> and <code>Infinity</code>, and neither can be put in order:
  </p>
  <DocsCode label={FINITE_NUMBER_OR_NULL.file} code={FINITE_NUMBER_OR_NULL.code} />
  <p>
    <code>BookEdit</code> and <code>applyEdit</code> accept both fields already: an absent field
    keeps the value, and <code>null</code> clears it. No screen sets them yet.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.carried}>
  <p>
    A removed book keeps a record for recovery (<a href={IDENTITY_REMOVED_HREF}
      >A removed book keeps a record</a
    >). That record now keeps the series id and the volume, read leniently like the rest of it, so a
    bad value becomes <code>null</code> instead of losing the record:
  </p>
  <DocsCode label={REMOVED_SERIES_FIELDS.file} code={REMOVED_SERIES_FIELDS.code} />
  <p>Uploading the same file again restores the book under the record's id, with both fields:</p>
  <DocsCode label={RESTORE_SERIES_FIELDS.file} code={RESTORE_SERIES_FIELDS.code} />
  <p>
    The captures export writes both fields on every book entry (<a href={EXPORT_FORMAT_HREF}
      >The dokseo-captures format</a
    >). Reading a file treats them as optional, so a file written before they existed still imports,
    and only a value of the wrong type rejects the entry. An import that holds captures under a new
    removed record, for a book this device lacks, keeps both fields there too.
  </p>
  <DocsCode label={FILE_SERIES_FIELDS.file} code={FILE_SERIES_FIELDS.code} />
</DocsSection>
