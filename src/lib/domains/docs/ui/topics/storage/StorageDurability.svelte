<script lang="ts">
  import {
    JAPANESE_OCR_MODEL,
    downloadMb,
  } from '$lib/domains/recognition/domain/model/model-footprint';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import RowCheckDemo from './RowCheckDemo.svelte';
  import { STORAGE_SECTIONS } from './storage-sections';
  import {
    BOOKS_FROM_STORED,
    CONSENT_ASKS,
    KNOWN_STORED_VALUE,
    PERSISTENCE_REQUEST,
  } from './storage-snippets';
</script>

<DocsSection title={STORAGE_SECTIONS.asking}>
  <p>
    Dokseo calls <code>persist()</code> at two moments, and never on first paint. The first is the
    start of every upload: adding a book is the clearest sign that the reader means to keep
    something here, and it comes after some use of the site rather than before any. The second is
    agreeing to download an OCR model, {downloadMb(JAPANESE_OCR_MODEL)} MB for the default Japanese one,
    which nobody wants to download twice.
  </p>
  <DocsCode label={CONSENT_ASKS.label} code={CONSENT_ASKS.code} />
  <p>
    The result changes nothing in either flow. A <code>false</code> is not a failure: the book is
    still added and the model still downloads, and the platform function turns every way the call
    can fail into
    <code>false</code>.
  </p>
  <DocsCode label={PERSISTENCE_REQUEST.label} code={PERSISTENCE_REQUEST.code} />
  <p>
    Chrome and Safari show no prompt, so the outcome is visible in one place: Settings › Storage
    marks the origin <q>Persistent</q> or <q>May be cleared</q>, and the engine settings say when
    persistence has not been granted. Removing the model withdraws the consent to download it, but
    leaves the persistence grant alone, because the grant protects the books and the captures too.
  </p>
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.rows}>
  <p>
    IndexedDB stores whatever value it is given and checks none of it. A row read back may have been
    written by an older version of Dokseo, before a field existed, or by a bug. So the library types
    a stored book as a record whose every field is <code>unknown</code>, and checks each field on
    the way out. A field with a safe default gets it: an unknown language reads as Japanese, a
    missing direction as right to left. A field with no safe default, such as the title, the layout
    kind or the reading place, throws a <code>CorruptRow</code> that names the field.
  </p>
  <DocsCode label={KNOWN_STORED_VALUE.label} code={KNOWN_STORED_VALUE.code} />
  <p>
    A throw must not take the library down with it, so the listing catches it per row. The row that
    failed is kept as an unreadable book, with whatever id, title, content hash and file name could
    be read, and the shelf lists it under <q>1 book could not be read</q>. From there the reader can
    remove it, merge it into a shelf book that matches it, or add the same file again to repair it,
    which
    <a href="/docs/book-identity">Book identity and recovery</a> explains. Captures are read the same
    way, and an unreadable capture is listed with a button to remove it.
  </p>
  <DocsCode label={BOOKS_FROM_STORED.label} code={BOOKS_FROM_STORED.code} />
  <RowCheckDemo />
  <p>
    A save goes through the same checks. To store a new reading place, the library reads the row
    with <code>bookFromStored</code>, applies the change, and writes the checked fields over the
    stored row with <code>savedBookRow</code>. A field the running version of Dokseo does not name
    stays in the row as it was, unchecked, and never reaches the app. So a tab left open on an older
    version does not erase a field that a newer version added.
  </p>
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.rule}>
  <p>
    Every store described above is a cache in the browser's eyes until the origin is persistent: the
    weights, the book files, the records and the captures can all be evicted, and in a Safari tab
    they can be removed after seven days of Safari use without a visit. Dokseo's rule follows from
    that. Caching is not durability. Request the persistence grant at a moment that earns it, never
    on first paint; check it with <code>persisted()</code> and say so when it is missing; report
    space with
    <code>estimate()</code>; and keep a way out for whatever is lost or unreadable, such as
    exporting the captures from Settings › Your data.
  </p>
</DocsSection>
