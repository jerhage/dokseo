<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import StrictReadDemo from './StrictReadDemo.svelte';
  import {
    EXPORT_FORMAT_HREF,
    IDENTITY_REMOVED_HREF,
    IDENTITY_UNREADABLE_HREF,
    RELEASES_BREAKING_HREF,
    SERIES_PLAN_SECTIONS,
    STORAGE_ROWS_HREF,
    seriesPlanHref,
  } from './series-sections';
  import {
    BOOK_FROM_STORED_SERIES,
    BOOK_SERIES_FIELDS,
    FILE_SERIES_FIELDS,
    FINITE_NUMBER,
    REMOVED_RECORD,
    REMOVED_SERIES_FIELDS,
    REPOSITORY_UPDATE,
    RESTORE_SERIES_FIELDS,
    STORED_SERIES_FIELDS,
  } from './series-snippets';
</script>

<DocsSection title={SERIES_PLAN_SECTIONS.built}>
  <p>
    Nothing of the series feature is visible yet. What is built is groundwork in the 1.0 book row,
    so that series can arrive in a later 1.x release as a minor version, with no reader having to
    act (<a href={RELEASES_BREAKING_HREF}>Breaking, for an app with no API</a>). The groundwork is a
    series id and a volume reserved on every book, and both fields copied wherever a book's fields
    are copied.
  </p>
  <p>
    The fields have to be in 1.0 because adding them later would change every stored book row, which
    after 1.0 means a new database version and a migration (<a href={seriesPlanHref('versions')}
      >Compatibility through database versions</a
    >). Reserved now, they cost nothing to read, and the first release with series only fills in
    fields that every row already has.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.read}>
  <p>
    Every edit to a stored book, a new reading place, a rename or a change of layout, goes through
    the library repository's <code>update()</code>:
  </p>
  <DocsCode label={REPOSITORY_UPDATE.file} code={REPOSITORY_UPDATE.code} />
  <p>
    The row is read with <code>bookFromStored</code>, which checks every field <code>Book</code>
    names and throws a <code>CorruptRow</code> for a bad one, so a damaged row is never written back
    (<a href={STORAGE_ROWS_HREF}>Reading a stored row back</a>). Every field is required, and none
    has a default. A missing field, an unknown language, a number that is <code>NaN</code> or
    infinite, and a content hash that is not a partial MD5 each make the row unreadable. The shelf
    then lists it apart, with a way out (<a href={IDENTITY_UNREADABLE_HREF}
      >Rows Dokseo can no longer read</a
    >).
  </p>
  <p>
    The edit is applied to the checked book, and the edited book is written as it is. A field the
    row holds and <code>Book</code> does not name is read past and not written back, which is safe
    only because a newer format always comes with a newer database version. A save also changes only
    the fields in its edit. <code>update()</code> reads the row at the moment of saving, so a page turn
    in one tab does not undo a rename made in another.
  </p>
  <StrictReadDemo />
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.reserved}>
  <p>The book type has two fields that every book holds as <code>null</code> today:</p>
  <DocsCode label={BOOK_SERIES_FIELDS.file} code={BOOK_SERIES_FIELDS.code} />
  <p>
    <code>seriesId</code> is a reference to a series record that does not exist yet.
    <code>SeriesId</code> is a branded string from <code>shared/ids.ts</code>. A series id is meant
    to be a UUID, like a tag or capture id, so it means the same series on every device; reading
    accepts any text that is not empty.
    <code>volume</code> is the book's position in the series. Both must be present in every row,
    like the alias, and both may be <code>null</code>. A row that lacks either field, or holds a
    value of the wrong type, is unreadable.
  </p>
  <DocsCode label={BOOK_FROM_STORED_SERIES.file} code={BOOK_FROM_STORED_SERIES.code} />
  <DocsCode label={STORED_SERIES_FIELDS.file} code={STORED_SERIES_FIELDS.code} />
  <p>
    A volume must also be finite. IndexedDB stores structured clones, which can hold
    <code>NaN</code> and <code>Infinity</code>, and neither can be put in order. Every stored number
    of a book, a capture or a tag passes the same check:
  </p>
  <DocsCode label={FINITE_NUMBER.file} code={FINITE_NUMBER.code} />
  <p>
    <code>BookEdit</code> and <code>applyEdit</code> accept both fields already: an absent field
    keeps the value, and <code>null</code> clears it. No screen sets them yet.
  </p>
</DocsSection>

<DocsSection title={SERIES_PLAN_SECTIONS.carried}>
  <p>
    A removed book keeps a record for recovery (<a href={IDENTITY_REMOVED_HREF}
      >A removed book keeps a record</a
    >). The record is the whole book plus the time it was removed, read with the same strict
    <code>bookFromStored</code>, so it holds the series id and the volume like every other field:
  </p>
  <DocsCode label={REMOVED_RECORD.file} code={REMOVED_RECORD.code} />
  <p>
    A record that fails the strict read is still listed under Removed books and still offered to a
    new upload of the same file. For that way out, the series id and the volume are taken when they
    pass their checks, and are <code>null</code> otherwise:
  </p>
  <DocsCode label={REMOVED_SERIES_FIELDS.file} code={REMOVED_SERIES_FIELDS.code} />
  <p>Uploading the same file again restores the book under the record's id, with both fields:</p>
  <DocsCode label={RESTORE_SERIES_FIELDS.file} code={RESTORE_SERIES_FIELDS.code} />
  <p>
    The captures export writes both fields on every book entry (<a href={EXPORT_FORMAT_HREF}
      >The dokseo-captures format</a
    >). Reading a file checks them with the book row's own checks: both must be present, and a
    missing field, a value of the wrong type or an empty series id rejects the entry. An import that
    holds captures under a new removed record, for a book this device lacks, keeps both fields there
    too.
  </p>
  <DocsCode label={FILE_SERIES_FIELDS.file} code={FILE_SERIES_FIELDS.code} />
</DocsSection>
