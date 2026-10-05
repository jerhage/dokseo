<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { BOOK_LIFE } from './identity-diagrams';
  import {
    BOOKS_FROM_STORED,
    MERGE_STRAY,
    REPOSITORY_REMOVE,
    REPOSITORY_REMOVE_CALL,
  } from './identity-snippets';
  import { IDENTITY_SECTIONS } from './sections';
</script>

<DocsSection title={IDENTITY_SECTIONS.life}>
  <p>
    A book id outlives the file it was made for. Each capture stores the id, so recovery is a matter
    of giving a later upload the old id back.
  </p>
  <Figure>
    <Diagram {...BOOK_LIFE} />
    {#snippet caption()}Where a book row can go, and how it comes back.{/snippet}
  </Figure>
  <StepList>
    <StepItem title="Added">
      An upload that matched nothing gets a new id and a row on the shelf.
    </StepItem>
    <StepItem title="Removed">
      Remove deletes the file and the row, and keeps a removed record under the same id. The
      captures stay.
    </StepItem>
    <StepItem title="Restored">
      The same file, or one that matches by name or title, takes the record's id back, and the
      captures attach again.
    </StepItem>
    <StepItem title="Unreadable">
      A row that this version of Dokseo cannot read is listed apart, with Remove, Merge and the same
      repair by upload.
    </StepItem>
    <StepItem title="Merged">
      An unreadable row that matches a shelf book gives its captures to that book and goes away.
    </StepItem>
    <StepItem title="Deleted">
      Delete captures, or Also delete its captures when removing, is the only step that ends the
      captures.
    </StepItem>
  </StepList>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.removed}>
  <p>
    Removing a book frees its space: the stored file, the cover, the page list and the book row go.
    The files go first. Then one transaction reads the book row, writes a record of it into a
    separate <code>removed-books</code> store, and deletes the row and its page list, so the record and
    the deletes commit together:
  </p>
  <DocsCode label={REPOSITORY_REMOVE_CALL.file} code={REPOSITORY_REMOVE_CALL.code} />
  <p>
    The record is the whole book plus <code>removedAt</code>, the time of the removal. It keeps the
    identity fields for matching, the language and direction its captures need, and the two series
    fields, which every book holds as <code>null</code> until series exist. A row that fails the strict
    read is kept as it was stored, with the time added, so removing it loses nothing:
  </p>
  <DocsCode label={REPOSITORY_REMOVE.file} code={REPOSITORY_REMOVE.code} />
  <p>
    The captures stay in their own store, untouched, still filed under the id. Records are read back
    with the same strict <code>bookFromStored</code>. A record that fails it, such as a raw row or a
    record with an old hash, is still listed under Removed books, by its alias, title or file name,
    with "Could not be read. Upload the same file again to restore it with its captures". For that
    match, its id, title, alias, series fields, hash and file name are read one at a time, each
    where it passes its check.
  </p>
  <p>
    The library lists removed records under Removed books, each with "Upload the same file again to
    restore it with its captures". When an upload matches one, the new book is stored under the
    record's id, alias, series id and volume, and storing it deletes the record. The remove dialog
    offers "Also delete its captures", unticked each time it opens, and each removed record has
    Delete captures, which deletes the captures and forgets the record.
  </p>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.unreadable}>
  <p>
    Each book row in IndexedDB is a plain object, written by whichever version of Dokseo stored it.
    When a version stops reading an older form, the older rows are still there. This is how that
    went wrong once:
  </p>
  <StepList>
    <StepItem title="The old reads go">
      Dokseo had no readers yet besides me, so I deleted the code that read older forms of a row: a
      reading place stored as a bare page number, a row with no file name, and others.
    </StepItem>
    <StepItem title="One old row remains">
      In my own browser, one book row still held its reading place as the bare number 45.
    </StepItem>
    <StepItem title="The shelf read fails">
      The shelf read mapped every row in one pass. The mapping of that row threw
      <code>no pattern matches value 45</code>, and the throw failed the whole read.
    </StepItem>
    <StepItem title="No way out">
      The library showed "Your library could not be read." Removing a book starts from the shelf,
      and there was no shelf, so nothing on screen could remove the row.
    </StepItem>
  </StepList>
  <p>The fix maps each row on its own and keeps the ones that throw:</p>
  <DocsCode label={BOOKS_FROM_STORED.file} code={BOOKS_FROM_STORED.code} />
  <p>
    <code>bookFromStored</code> checks every field with a type guard and throws a
    <code>CorruptRow</code> error for the first one it cannot read. No field has a default, so a
    missing file name, an unknown language, a count of <code>NaN</code> and an old 64-character hash all
    land here, not only a bad enum. An unreadable book keeps what can still be read: its id, and its title,
    alias, hash and file name where they are strings. Only a row with no usable id still fails the read.
  </p>
  <p>
    The library shows unreadable books in a warning above the shelf, "1 book could not be read",
    with "Upload the same file again to repair it." Each entry has Remove, which keeps the captures
    through a removed record like any removal, and Remove all. When <code>shelfMatch</code> finds a shelf
    book for the row by hash, file name or title, the entry also offers "Merge into" that book's name.
    An upload that reaches the restore stage repairs the row in place: the new book is stored under the
    row's id and replaces it.
  </p>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.merge}>
  <p>Repair by upload had a gap, which showed up like this:</p>
  <StepList>
    <StepItem title="Two rows, one book">
      I had a readable copy of an EPUB on the shelf, and an old unreadable row for the same book
      with captures on it.
    </StepItem>
    <StepItem title="The same EPUB again">
      I uploaded the EPUB. Its hash matched the readable copy, so <code>openFile</code> answered
      <code>already-held</code> at the first stage.
    </StepItem>
    <StepItem title="The restore never runs">
      The second stage only runs when the first finds nothing, so the unreadable row was never
      compared, and its warning stayed.
    </StepItem>
  </StepList>
  <p>
    Now every join also runs <code>mergeableRows</code> over the unreadable rows, with the upload's
    hash and file name, the held book's title and the upload's file title. Each match is merged into
    the held book by the storage use case <code>mergeIntoBook</code>, one row at a time:
  </p>
  <DocsCode label={MERGE_STRAY.file} code={MERGE_STRAY.code} />
  <p>
    Moving the captures rewrites every capture of the row to the held book's id in one IndexedDB
    transaction. Erasing the row then removes its files and, in one transaction, deletes its book
    row, its page list and any removed record, without writing a new one. Captures and books live in
    different databases, so no transaction spans the two steps; the order makes a partial failure
    safe instead. If the captures moved but the row stayed, the row is still unreadable and still
    matches, so its Merge button finishes the job.
  </p>
  <p>
    The upload toast then reads "Its old captures were moved onto it." Only unreadable rows merge
    this way. A removed record that matches a held book stays where it is.
  </p>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.legacy}>
  <p>
    Before the partial MD5, Dokseo's hash was a SHA-256 of the file size, the first MiB and the last
    MiB. It is 64 hex characters long, where a partial MD5 is 32. For a while, an upload computed
    both and moved a matching old row onto the new hash. That code went with the other old reads.
  </p>
  <p>
    Nothing computes the old form now, so a 64-character hash never equals an upload's hash, and an
    old row can only be found by file name or title. Rows stored before Dokseo kept file names have
    none, so the title is their only key. That was the case I hit: an unreadable EPUB row with a
    SHA-256 hash and no file name did not repair when I uploaded the same EPUB, because the restore
    stage then compared only hash and file name. The title step exists for that row. Its title came
    from the file name, while the new upload's title came from <code>dc:title</code>, which is why
    the step compares both titles.
  </p>
  <p>
    Since the stored format was fixed for 1.0, the content hash must be a partial MD5, so a row with
    a 64-character hash fails the strict read and is always listed apart as unreadable. It never
    stays on the shelf beside a new copy: the same file uploaded again finds it by file name or
    title in the restore stage and repairs it in place.
  </p>
</DocsSection>

<DocsSection title={IDENTITY_SECTIONS.rules}>
  <ul>
    <li>
      Match on content first. A file name or a title only recovers what the hash cannot, and the
      shelf join never uses a title.
    </li>
    <li>Keep the original title; a rename is an alias.</li>
    <li>
      Removing a book keeps its captures and a record to restore it. Deleting captures is a choice
      made on its own.
    </li>
    <li>Map stored rows one at a time, so one unreadable row never fails a list.</li>
    <li>
      A change to what Dokseo can read ships with the way out: every unreadable row can be removed,
      merged or repaired from the screen.
    </li>
  </ul>
</DocsSection>
