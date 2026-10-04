<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { useContainer } from '$lib/context';
  import StorageBreakdown from '$lib/domains/storage/ui/StorageBreakdown.svelte';
  import StorageData from '$lib/domains/storage/ui/StorageData.svelte';
  import StorageSummary from '$lib/domains/storage/ui/StorageSummary.svelte';
  import { BLOCKED_PATIENCE_MS } from '$lib/platform/idb/connection';
  import { WRITE_CHUNK_BYTES } from '$workers/blob-chunks';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DATA_MAP } from './storage-diagrams';
  import { STORAGE_SECTIONS } from './storage-sections';
  import { READER_UPGRADE, STORAGE_ACCOUNT, WRITER_LOOP } from './storage-snippets';

  const storage = useContainer().storage;

  const DATABASE_STORES = [
    {
      database: 'reader v3',
      store: 'books',
      key: 'id',
      holds: 'One row per book: title, language, layout, content hash, reading place',
    },
    {
      database: 'reader v3',
      store: 'page-lists',
      key: 'id',
      holds: 'The page order fixed when a ZIP or a set of images was added',
    },
    {
      database: 'reader v3',
      store: 'removed-books',
      key: 'id',
      holds:
        'The whole row of a removed book plus the time it was removed, so its captures still have a title and a new upload of it can be matched',
    },
    {
      database: 'recognition v5',
      store: 'captures',
      key: 'id, indexed by bookId and by each tag id',
      holds: 'Recognized text, its regions on the page, note and tags',
    },
    { database: 'recognition v5', store: 'tags', key: 'id', holds: 'The tags a capture can have' },
    {
      database: 'recognition v5',
      store: 'model-consent',
      key: 'language',
      holds: "The agreement to download a language's model, naming the model",
    },
    {
      database: 'recognition v5',
      store: 'recognizer-setup',
      key: 'language',
      holds: 'The chosen model and compute for a language',
    },
    {
      database: 'flowing v1',
      store: 'reading-settings',
      key: 'reader',
      holds: "The EPUB reader's text size, line spacing and reading aids, in one row",
    },
  ] as const;

  const patienceSeconds = BLOCKED_PATIENCE_MS / 1000;
  const chunkMiB = WRITE_CHUNK_BYTES / (1024 * 1024);
</script>

<DocsSection title={STORAGE_SECTIONS.map}>
  <p>
    Dokseo is a reader for manga and books that keeps everything on the device. It uses all four
    stores, and puts each kind of data in the one built for it. Book records, captures and tags are
    small, structured and looked up by id, so they go in IndexedDB. A book's file is large, opaque
    and read a range at a time, so it goes in the origin private file system. The OCR model's
    weights go where transformers.js already puts them, the Cache API. A few preferences have to be
    readable before the first paint, so they go in <code>localStorage</code>.
  </p>
  <Figure>
    <Diagram {...DATA_MAP} />
    {#snippet caption()}
      Where Dokseo's data lives. The highlighted stores hold what a reader would lose: the books and
      the captures.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.databases}>
  <p>
    Each domain of the app opens its own database through its own adapter, so the library never
    reads a capture store and the recognizer never reads a book store.
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Database and store</TableHeaderCell>
        <TableHeaderCell>Holds</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each DATABASE_STORES as entry (entry.store)}
        <TableRow>
          <TableCell>
            <div class="col gap-1">
              <span><code>{entry.database}</code> › <code>{entry.store}</code></span>
              <span class="text-xs text-muted">key {entry.key}</span>
            </div>
          </TableCell>
          <TableCell>{entry.holds}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The adapters share one connection module, <code>platform/idb/connection.ts</code>, which keeps
    one open connection per database name. Its job is the case two tabs make together, when one of
    them runs a newer build:
  </p>
  <StepList>
    <StepItem title="A new build opens a higher version">
      <p>
        The new tab opens <code>reader</code> at a version above the one on disk. IndexedDB sends a
        <code>versionchange</code> event to every other connection first.
      </p>
    </StepItem>
    <StepItem title="The old tab closes its connection">
      <p>
        The connection module closes the connection and marks it retired, so the upgrade can run.
        Had it stayed open, the new tab would wait in <code>blocked</code>, and after {patienceSeconds}
        seconds it fails with a message that says another tab holds the database.
      </p>
    </StepItem>
    <StepItem title="The old tab is told to reload">
      <p>
        The old tab's next transaction reopens at its own, now lower, version, which fails with a
        <code>VersionError</code>. The message reads:
        <q
          >was upgraded by a newer version of the app in another tab. Reload this page to keep
          going.</q
        >
      </p>
    </StepItem>
  </StepList>
  <p>
    An upgrade creates only the stores that are missing, and never touches a row. That is how
    <code>reader</code> reached version 3: removing a book started keeping a record of it, which
    needed the <code>removed-books</code> store, and the books already stored stayed as they were. From
    1.0 on, the same steps are the only way to change what a stored row holds: a new version, and an upgrade
    that rewrites the rows to the new format. An older build then cannot open the database at all, so
    no build ever reads a row in a format it does not know.
  </p>
  <DocsCode label={READER_UPGRADE.label} code={READER_UPGRADE.code} />
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.books}>
  <p>
    The file a reader adds is stored whole in the origin private file system, in a folder named
    <code>blobs</code>: <code>&lt;book id&gt;.src</code> for the file and
    <code>&lt;book id&gt;.cover</code>
    for its cover. Pages are never extracted. A ZIP, an EPUB or a PDF is read one entry or one byte range
    at a time with <code>Blob.slice</code>. A second folder, <code>partials</code>, holds the part
    of a model weight file whose download was interrupted, so it resumes where it stopped, which
    <a href="/docs/ocr#consent-and-the-download">the OCR page</a> explains.
  </p>
  <p>
    The write used to call <code>createWritable()</code> on the main thread. Adding a book on an
    older iPhone failed with <q>createWritable is not a function</q>, because Safari shipped it only
    in version 26. The API every engine has, <code>createSyncAccessHandle()</code>, works only in a
    dedicated worker, so the write moved into one. <code>blob-store.ts</code> hands the
    <code>Blob</code> to <code>opfs-writer.worker.ts</code> in a message. Posting a
    <code>Blob</code>
    passes a reference to its bytes, not a copy, so a 400 MB archive is not read into the page's memory.
    The worker writes it in {chunkMiB} MiB ranges and reports after each one, which is where the upload's
    progress bar comes from.
  </p>
  <DocsCode label={WRITER_LOOP.label} code={WRITER_LOOP.code} />
  <p>
    Only the write moved. Reading a file, listing a folder and removing an entry work on the main
    thread in every engine, and stay there.
  </p>
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.cache}>
  <p>
    The Cache API holds two kinds of cache. <code>transformers-cache</code> is transformers.js's own
    cache of the OCR model's weights and the ONNX Runtime binary, keyed by their download URLs;
    Dokseo writes no cache code for them, and
    <a href="/docs/ocr#the-model-cache-and-offline-use">the OCR page</a>
    covers it. The weights come from another origin, which
    <a href="/docs/security-headers#model-downloads-under-coep">Security headers</a> explains. The
    second cache is the service worker's copy of the app itself, named
    <code>reader-shell-</code> plus the build's version, which
    <a href="/docs/offline">Offline and the PWA</a> covers.
  </p>
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.preferences}>
  <p>
    Thirteen small values live in <code>localStorage</code>, the preferences and which touch guides
    were seen, each under a key that starts with <code>reader.</code>, such as
    <code>reader.theme</code>, <code>reader.library.sort</code> and
    <code>reader.captures.sort</code>. The theme and the color scheme are why it is
    <code>localStorage</code> and not IndexedDB: an inline script in <code>app.html</code> reads them
    synchronously and sets the theme before the first paint, which an asynchronous store cannot do without
    a flash of the wrong colors.
  </p>
  <p>
    Every read and write goes through <code>rememberedString</code> or <code>rememberedSet</code>,
    which catch any exception the storage throws, and each key's reader checks the stored value
    before using it. Losing these keys costs a preference, never a book.
  </p>
</DocsSection>

<DocsSection title={STORAGE_SECTIONS.account}>
  <p>
    <code>estimate()</code> gives one number for the whole origin, and a figure nobody can explain
    is not much use to a reader who wants space back. Settings › Storage therefore builds an
    account. The
    <code>storage</code> domain's <code>OriginStores</code> port lists every response in every cache
    and every file in the origin private file system, with sizes. <code>readStorageAccount</code>
    sorts them into parts: each model's weights, the ONNX runtime, other cached downloads, the books,
    the part-downloads, and other files.
  </p>
  <p>
    IndexedDB has no API that reports the size of a database, so the records are listed as a part
    that cannot be measured. The measured parts are then added up and compared with
    <code>estimate().usage</code>, and whatever they do not explain is shown by name as
    <q>Other browser storage</q> rather than left out.
  </p>
  <DocsCode label={STORAGE_ACCOUNT.label} code={STORAGE_ACCOUNT.code} />
  <DocsDemo label="This origin's storage account" resettable resetLabel="Read again">
    <StorageData {storage}>
      {#snippet children(held)}
        <StorageSummary account={held} />
        <StorageBreakdown account={held} />
      {/snippet}
    </StorageData>
    {#snippet caption()}
      The real use case and the real Settings › Storage components, reading this origin. After a
      scratch demo above writes something, read again to see it appear.
    {/snippet}
  </DocsDemo>
</DocsSection>
